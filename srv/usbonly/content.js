/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config');
    var shell = require('shelljs');
    var spawn = require('child_process').spawn;
    var path = require('path');
    var os = require('os');
    var uuid = require('uuid/v1');
    var versions = require('./versions');
    var fs = require('fs');
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');
    var usbDrive = require('./usbCache');
    var winston = require('winston');
    // The Windows package contains an unused image file (install.wim) and inefficient driver collections.
    // We need to remove and replace these large files.
    // In the meantime, we use the --exclude parameter to make sure we don't copy them to the USB drive
    var rsyncParameters = '--recursive --copy-links --times --modify-window=1 --delete-before --no-inc-recursive --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Images/install.wim --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/HP-* --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/Hewlett-Packard-* --exclude=packages/97fc1b7c-049f-4933-88e5-cb19362e3360/Drivers/Dell-*';

    //var totalProgress = null;

    function updateProgress(value, device) {
        winston.info('Progress for device: ' + device + ' is: ' + value + '%');
        usbDrive.updateProgress(value, device);
        var minProgress = usbDrive.getLowestUsbInProgress();
        io.emit('usb-progress', minProgress);
    }

    function copyFiles(
        contentTemp, copyFilesSize, totalSize, device, callback) {
        winston.info('Copying files to USB');
        var err = '';
        var sentProgress = 0;
        var progressRatio = copyFilesSize / totalSize;

        var rsyncCommand = 'rsync ' + rsyncParameters + ' --info=progress2 ' +
            path.join(contentTemp, '*') + ' /mnt/';
        winston.info('Running command "' + rsyncCommand + '"');
        var rsync = spawn('script', ['-c', rsyncCommand]);

        rsync.stdout.on('data', function(data) {
            var message = decoder.write(data);
            try {
                var progress = Math.round(parseInt(
                    message.match(/[^ ]+/g)[2].replace('%', '')) *
                    progressRatio);
                if (progress > sentProgress) {
                    // addProgress(progress - sentProgress);
                    updateProgress(progress, device);
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
            winston.info('rsync process exited with code ' + code.toString());
            winston.info(err);
            if (code !== 0) {
                callback(new Error(err));
            } else {
                callback(null);
            }
        });
    }

    function applyMacImage(device, macImageSize, totalSize, callback) {
        winston.info('Applying Mac image');
        var err = '';
        var sentProgress = 0;
        var progressRatio = macImageSize / totalSize;

        var ddCommand = 'dd bs=4M if=' + config.macContent +
            ' | pv --numeric --size ' + macImageSize + ' | dd bs=4M of=/dev/' +
            device + config.usbMacPartition + ' && sync';
        winston.info('Running command "' + ddCommand + '"');
        var dd = spawn('script', ['-c', ddCommand]);

        dd.stdout.on('data', function(data) {
            var message = decoder.write(data);
            try {
                var progress = Math.round(parseInt(message) * progressRatio);
                if (progress > sentProgress && progress <= 100) {
                    updateProgress(progress, device);
                    sentProgress = progress;
                }
            } catch (err) {
            }
        });

        dd.stderr.on('data', function(data) {
            var message = decoder.write(data);
            err += message;
        });

        dd.on('exit', function(code) {
            shell.exec('sync', function() {
                if (code !== 0) {
                    winston.info('dd process exited with code ' +
                        code.toString());
                    winston.info(err);
                    callback(new Error(err));
                } else {
                    callback(null);
                }
            });
        });
    }

    function createItemFile(device, item, callback) {
        var usbItemFile = '/mnt/' + device + config.usbStatusPartition +
            '/item.json';
        try {
            var json = JSON.stringify(item);
            fs.writeFile(usbItemFile, json, callback);
        } catch (err) {
            callback(err);
        }
    }

    function finishApplyContent(device, callback) {
        winston.info('Device ' + device + ' content update is complete.');
        versions.createVersionsFile(device, function(err) {
            if (err) {
                console.log('error', err);
            }
            callback();
        });
    }

    function copyFilesAndApplyImages(
        device, contentTemp, copyFilesSize, macImageSize, applyMac,
        callback) {
        var totalSize = macImageSize + copyFilesSize;
        //updateProgress(0, device);
        copyFiles(contentTemp, copyFilesSize, totalSize, device, function(err) {
            if (err) {
                callback(err);
            } else {
                if (applyMac) {
                    applyMacImage(device, macImageSize, totalSize,
                        function(err) {
                            if (err) {
                                callback(err);
                            } else {
                                finishApplyContent(device, callback);
                            }
                        });
                } else {
                    finishApplyContent(device, callback);
                }
            }
        });
    }

    function updateContent(device, callback) {
        winston.info('Updating content on ' + device);

        versions.getCurrentVersions(function(err, currentVersions) {
            if (err) {
                callback(err);
            } else {
                winston.info('Current Versions:');
                winston.info(currentVersions);
                versions.getUsbVersions(device, function(err, usbVersions) {
                    if (err) {
                        callback(err);
                    } else {
                        winston.info('USB Versions:');
                        winston.info(usbVersions);
                        // Prepare files to copy
                        var contentTemp = path.join(os.tmpdir(), 'tmp', uuid());
                        shell.mkdir('-p', [
                            path.join(contentTemp, device +
                                config.usbXboxPartition),
                            path.join(contentTemp, device +
                                config.usbWindowsPartition, 'default'),
                            path.join(contentTemp, device +
                                config.usbWindowsPartition, 'packages')]);
                        // Prepare Xbox Files
                        var command = 'ln -s ' + config.xboxContent + ' ' +
                            path.join(contentTemp, device +
                                config.usbXboxPartition);
                        // Prepare WinPE Boot Files
                        command += ' && ln -s ' + config.winPeContent + ' ' +
                            path.join(contentTemp, device +
                                config.usbWindowsPartition);
                        // Prepare WinPE Refresh App
                        command += ' && ln -s ' + config.winPeAppContent + ' ' +
                            path.join(contentTemp, device +
                                config.usbWindowsPartition, 'default');
                        // Prepare Windows Files
                        command += ' && ln -s ' + config.windowsContent + ' ' +
                            path.join(contentTemp, device +
                                config.usbWindowsPartition, 'packages');
                        shell.exec(command, function(code, stdout, stderr) {
                            if (code !== 0) {
                                callback(new Error(stderr));
                            } else {
                                // Get size of files to copy
                                shell.exec('rsync ' + rsyncParameters +
                                    ' --stats --dry-run ' +
                                    path.join(contentTemp, '*') +
                                    ' /mnt/ | grep "Total transferred file size:" | awk \'{print $5;}\' | sed \'s/,//g\'',
                                    function(code, stdout, stderr) {
                                        if (code !== 0) {
                                            callback(new Error(stderr));
                                        } else {
                                            var copyFilesSize = parseInt(
                                                stdout.trim().split(os.EOL));
                                            if (usbVersions === null ||
                                                usbVersions.mac !==
                                                currentVersions.mac) {
                                                shell.exec('du --bytes --dereference ' +
                                                    config.macContent +
                                                    ' | awk \'END {print $1;}\'',
                                                    {silent: true},
                                                    function(
                                                        code, stdout, stderr) {
                                                        if (code !== 0) {
                                                            callback(
                                                                new Error(
                                                                    stderr));
                                                        } else {
                                                            var macImageSize = parseInt(
                                                                stdout.trim().
                                                                    split(
                                                                        os.EOL));
                                                            copyFilesAndApplyImages(
                                                                device,
                                                                contentTemp,
                                                                copyFilesSize,
                                                                macImageSize,
                                                                true, callback);
                                                        }
                                                    });
                                            } else {
                                                copyFilesAndApplyImages(device,
                                                    contentTemp, copyFilesSize,
                                                    0,
                                                    false, callback);
                                            }
                                        }
                                    });
                            }
                        });
                    }
                });
            }
        });
    }

    function clearStatus(device) {
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
    }

    return {
        'createItemFile': createItemFile,
        'updateContent': updateContent,
        'clearStatus': clearStatus
    };
};
