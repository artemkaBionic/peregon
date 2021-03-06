/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config.js');
    var shell = require('shelljs');
    var spawn = require('child_process').spawn;
    var path = require('path');
    var os = require('os');
    var uuid = require('uuid/v1');
    var versions = require('./versions');
    var Promise = require('bluebird');
    Promise.config({
        // Enable cancellation
        cancellation: true
    });
    var fs = Promise.promisifyAll(require('fs'));
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');
    var usbDrives = require('./usbCache');
    var winston = require('winston');
    // The Windows package contains an unused image file (install.wim) and inefficient driver collections.
    // We need to remove and replace these large files.
    // In the meantime, we use the --exclude parameter to make sure we don't copy them to the USB drive
    var rsyncParameters = '--recursive --copy-links --times --modify-window=1 --delete-before --no-inc-recursive --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Images/install.wim --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/HP-* --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/Hewlett-Packard-* --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/Dell-*';

    function updateProgress(device, value) {
        winston.info('Progress for ' + device + ' is ' + value + '%');
        usbDrives.updateProgress(device, value);
        usbDrives.getLowestUsbProgress().then(function(minProgress) {
            winston.info('Lowest progress of all devices is ' + minProgress + '%');
            io.emit('usb-progress', minProgress);
        });
    }

    function copyFiles(device, contentTemp, copyFilesSize, totalSize) {
        return new Promise(function(resolve, reject, onCancel) {
            winston.info('Copying files to USB');
            var err = '';
            var sentProgress = 0;
            var progressRatio = copyFilesSize / totalSize;

            var rsyncCommand = 'rsync ' + rsyncParameters + ' --info=progress2 ' + path.join(contentTemp, '*') + ' /mnt/';
            winston.info('Running command "' + rsyncCommand + '"');
            var rsync = spawn('/bin/sh', ['-c', rsyncCommand]);

            rsync.stdout.on('data', function(data) {
                var message = decoder.write(data);
                try {
                    var progress = Math.round(parseInt(message.match(/[^ ]+/g)[2].replace('%', '')) * progressRatio);
                    if (progress > sentProgress) {
                        updateProgress(device, progress);
                        sentProgress = progress;
                    }
                } catch (err) {
                }
            });

            rsync.stderr.on('data', function(data) {
                var message = decoder.write(data);
                err += message;
            });

            rsync.on('exit', function(code) {
                winston.info(err);
                if (code === 20) {
                    winston.info('Copying files to USB has been cancelled.');
                } else if (code !== 0) {
                    winston.info('rsync process exited with code ' + code.toString());
                    reject(new Error(err));
                } else {
                    resolve();
                }
            });

            onCancel(function() {
                shell.exec('pkill -15 -P ' + rsync.pid.toString());
            });
        });
    }

    function applyMacImage(device, macImageSize, totalSize) {
        return new Promise(function(resolve, reject, onCancel) {
            winston.info('Applying Mac image');
            var err = '';
            var sentProgress = 0;
            var progressRatio = macImageSize / totalSize;
            var progressStart = 100 - (100 * progressRatio);

            var ddCommand = 'dd ibs=4M if=' + config.macContent + ' | pv --numeric --size ' + macImageSize +
                ' | dd obs=4M of=/dev/' + device + config.usbMacPartition + ' oflag=direct && sync';
            winston.info('Running command "' + ddCommand + '"');
            var dd = spawn('/bin/sh', ['-c', ddCommand]);

            dd.stderr.on('data', function(data) {
                var message = decoder.write(data);
                try {
                    var progress = Math.round(progressStart + (parseInt(message) * progressRatio));
                    if (progress > sentProgress && progress <= 100) {
                        updateProgress(device, progress);
                        sentProgress = progress;
                    }
                } catch (err) {
                }
            });

            dd.on('exit', function(code) {
                if (code === 143) {
                    winston.info('Applying Mac image has been cancelled.');
                } else if (code !== 0) {
                    winston.error('dd process exited with code ' + code.toString());
                    reject(new Error(err));
                } else {
                    resolve();
                }
            });

            onCancel(function() {
                shell.exec('pkill -15 -P ' + dd.pid.toString());
            });
        });
    }

    function finishApplyContent(device) {
        winston.info('Device ' + device + ' content update is complete.');
        return versions.createVersionsFile(device);
    }

    function copyFilesAndApplyImages(device, contentTemp, copyFilesSize, macImageSize, applyMac) {
        var totalSize = macImageSize + copyFilesSize;
        return copyFiles(device, contentTemp, copyFilesSize, totalSize).then(function() {
            return applyMac ? applyMacImage(device, macImageSize, totalSize) : Promise.resolve();
        }).then(function() {
            return finishApplyContent(device);
        });
    }

    function updateContent(device) {
        return versions.getCurrentVersions().then(function(currentVersions) {
            return versions.getUsbVersions(device).then(function(usbVersions) {
                return new Promise(function(resolve, reject) {
                    winston.info('Updating content on ' + device);
                    // Prepare files to copy
                    var contentTemp = path.join(config.kioskTempPath, uuid());
                    shell.mkdir('-p', [
                        path.join(contentTemp, device + config.usbXboxPartition),
                        path.join(contentTemp, device + config.usbWindowsPartition, 'default'),
                        path.join(contentTemp, device + config.usbWindowsPartition, 'packages')]);
                    // Prepare Xbox Files
                    var command = 'ln -s ' + config.xboxContent + ' ' +
                        path.join(contentTemp, device + config.usbXboxPartition);
                    // Prepare WinPE Boot Files
                    command += ' && ln -s ' + config.winPeContent + ' ' +
                        path.join(contentTemp, device + config.usbWindowsPartition);
                    // Prepare WinPE Refresh App
                    command += ' && ln -s ' + config.winPeAppContent + ' ' +
                        path.join(contentTemp, device + config.usbWindowsPartition, 'default');
                    // Prepare Windows Files
                    command += ' && ln -s ' + config.windowsContent + ' ' +
                        path.join(contentTemp, device + config.usbWindowsPartition, 'packages');
                    shell.exec(command, function(code, stdout, stderr) {
                        if (code !== 0) {
                            reject(new Error(stderr));
                        } else {
                            // Get size of files to copy
                            shell.exec('rsync ' + rsyncParameters + ' --stats --dry-run ' +
                                path.join(contentTemp, '*') +
                                ' /mnt/ | grep "Total transferred file size:" | awk \'{print $5;}\' | sed \'s/,//g\'',
                                function(code, stdout, stderr) {
                                    if (code !== 0) {
                                        reject(new Error(stderr));
                                    } else {
                                        var copyFilesSize = parseInt(stdout.trim().split(os.EOL));
                                        if (usbVersions === null || usbVersions.mac !== currentVersions.mac) {
                                            shell.exec('du --bytes --dereference ' + config.macContent +
                                                ' | awk \'END {print $1;}\'', {silent: true},
                                                function(code, stdout, stderr) {
                                                    if (code !== 0) {
                                                        reject(new Error(stderr));
                                                    } else {
                                                        var macImageSize = parseInt(stdout.trim().split(os.EOL));
                                                        resolve(
                                                            copyFilesAndApplyImages(device, contentTemp, copyFilesSize,
                                                                macImageSize, true));
                                                    }
                                                });
                                        } else {
                                            resolve(
                                                copyFilesAndApplyImages(device, contentTemp, copyFilesSize, 0, false));
                                        }
                                    }
                                }
                            );
                        }
                    });
                });
            });
        });
    }

    function clearStatus(device) {
        return new Promise(function(resolve) {
            winston.info('Clearing status for device:' + device);
            //Remove Xbox Refresh status files
            shell.rm([
                '/mnt/' + device + config.usbXboxPartition +
                '/$SystemUpdate/smcerr.log',
                '/mnt/' + device + config.usbXboxPartition +
                '/$SystemUpdate/update.cfg',
                '/mnt/' + device + config.usbXboxPartition +
                '/$SystemUpdate/update.log',
                '/mnt/' + device + config.usbXboxPartition +
                '/$SystemUpdate/update2.cfg']);
            //Remove Windows and Mac Refresh status files
            shell.rm([
                '/mnt/' + device + config.usbStatusPartition + '/item.json',
                '/mnt/' + device + config.usbStatusPartition + '/refresh.log',
                '/mnt/' + device + config.usbStatusPartition + '/sessions/*.json',
                '/mnt/' + device + config.usbStatusPartition + '/system-info.txt']);
            resolve();
        });
    }

    return {
        'updateContent': updateContent,
        'clearStatus': clearStatus
    };
};
