/*jslint node: true */
'use strict';
var config = require('../config.js');
var os = require('os');
var shell = require('shelljs');
var winston = require('winston');
var Promise = require('bluebird');

function doesMbrExist(device) {
    return new Promise(function(resolve, reject) {
        shell.exec('parted --script /dev/' + device + ' --machine print', {silent: true},
            function(code, stdout, stderr) {
                if (code !== 0) {
                    winston.error('Failed to check if USB ' + device + ' has a MBR, parted returned error code ' + code + ' ' + stdout);
                    reject(new Error(stderr));
                } else {
                    var deviceInfo = stdout.trim().split(os.EOL)[1].split(':');
                    var mbrExists = deviceInfo[5] === 'msdos';
                    resolve(mbrExists);
                }
            });
    });
}

function doPartitionsExist(device) {
    return new Promise(function(resolve, reject) {
        shell.exec('lsblk --output name,label,size --pairs /dev/' + device, {silent: true},
            function(code, stdout, stderr) {
                if (code !== 0) {
                    reject(new Error(stderr));
                } else {
                    var partitionsInfo = stdout.trim().split(os.EOL);
                    var correctPartitionsExist = partitionsInfo.length === 5 &&
                        partitionsInfo[1].indexOf('LABEL="XboxRefresh"') >= 0 &&
                        partitionsInfo[2].indexOf('LABEL="WinRefresh"') >= 0 &&
                        partitionsInfo[3].indexOf('LABEL="MacRefresh"') >= 0 &&
                        partitionsInfo[4].indexOf('LABEL="Status"') >= 0;
                    resolve(correctPartitionsExist);
                }
            });
    });
}

function checkPartitioning(device) {
    return doesMbrExist(device).then(function(mbrExists) {return mbrExists ? doPartitionsExist(device) : false;});
}

function unmountPartitions(device) {
    return new Promise(function(resolve) {
        winston.info('Unmounting USB device ' + device);
        shell.exec('sync && umount /mnt/' + device + '?', {silent: true},
            function(code, stdout, stderr) {
                stderr = stderr.replace(/umount:.*not found\n/g, '').replace(/umount:.*not mounted\n/g, '');
                if (stderr.length === 0) {
                    winston.info('Unmounted all devices successfully');
                } else {
                    winston.error('Unmounting failed because of error code: ' + code + ', ' + stderr);
                }
                shell.rm('-rf', '/mnt/' + device + '?');
                resolve();
            });
    });
}

function mountPartitions(device) {
    return new Promise(function(resolve, reject) {
        winston.info('Mounting partitions for device: ' + device);
        shell.mkdir('-p', [
            '/mnt/' + device + config.usbXboxPartition,
            '/mnt/' + device + config.usbWindowsPartition,
            '/mnt/' + device + config.usbStatusPartition]);
        shell.exec('mount /dev/' + device + config.usbXboxPartition + ' /mnt/' + device + config.usbXboxPartition +
            ' && mount /dev/' + device + config.usbWindowsPartition + ' /mnt/' + device + config.usbWindowsPartition +
            ' && mount /dev/' + device + config.usbStatusPartition + ' /mnt/' + device + config.usbStatusPartition,
            function(code, stdout, stderr) {
                if (code !== 0) {
                    unmountPartitions(device).then(function() {
                        reject(new Error(stderr));
                    });
                } else {
                    resolve();
                }
            });
    });
}

function updatePartitions(device) {
    return checkPartitioning(device).then(function(isPartitioned) {
        winston.info('Updating partitions for device: ' + device);
        if (isPartitioned) {
            winston.info('USB device ' + device + ' already partitioned correctly');
            return mountPartitions(device);
        } else {
            winston.info('Partitions update process started for device: ' + device);
            return new Promise(function(resolve, reject) {
                // Get disk size
                shell.exec('parted --machine --script /dev/' + device +
                    ' unit MiB print | awk -F: \'FNR==2{print $2}\'',
                    function(code, stdout, stderr) {
                        if (code !== 0) {
                            reject(new Error(stderr));
                        } else {
                            var totalDiskSize = parseInt(
                                stdout.split(os.EOL)[0].replace('MiB', ''));
                            var windowsPartitionSize = totalDiskSize -
                                config.usbXboxPartitionSize -
                                config.usbMacPartitionSize -
                                config.usbStatusPartitionSize;
                            var partitionStart = 0;
                            var partitionEnd = 0;

                            winston.info('Initializing new USB device ' + device);
                            // Initialize MBR
                            var script = 'mklabel msdos \\';
                            // Create Xbox Partition
                            partitionEnd = config.usbXboxPartitionSize;
                            script += '\nmkpart primary ntfs 0% ' +
                                partitionEnd + 'MiB \\';
                            // Create Windows Partition
                            partitionStart = partitionEnd + 1;
                            partitionEnd = partitionEnd + windowsPartitionSize;
                            script += '\nmkpart primary fat32 ' + partitionStart + 'MiB ' + partitionEnd + 'MiB \\';
                            // Create Mac Partition
                            partitionStart = partitionEnd + 1;
                            partitionEnd = partitionEnd + config.usbMacPartitionSize;
                            script += '\nmkpart primary hfs+ ' + partitionStart + 'MiB ' + partitionEnd + 'MiB \\';
                            // Create Status Partition
                            partitionStart = partitionEnd + 1;
                            script += '\nmkpart primary fat32 ' + partitionStart + 'MiB 100%';
                            shell.exec('parted --script /dev/' + device + ' ' + script, function(code, stdout, stderr) {
                                if (code !== 0) {
                                    reject(new Error(stderr));
                                } else {
                                    // Build Xbox File System
                                    var command = 'mkfs.ntfs -f -L "XboxRefresh" /dev/' + device +
                                        config.usbXboxPartition;
                                    // Build Windows File System
                                    command += ' && mkfs.vfat -F32 -n "WinRefresh" /dev/' + device +
                                        config.usbWindowsPartition;
                                    // Build Mac File System
                                    command += ' && mkfs.hfsplus -v "MacRefresh" /dev/' + device +
                                        config.usbMacPartition;
                                    // Build Status File System
                                    command += ' && mkfs.vfat -F32 -n "Status" /dev/' + device +
                                        config.usbStatusPartition;
                                    shell.exec(command, function(code, stdout, sdterr) {
                                        if (code !== 0) {
                                            reject(new Error(stderr));
                                        } else {
                                            resolve(mountPartitions(device));
                                        }
                                    });
                                }
                            });
                        }
                    });
            });
        }
    });
}

module.exports = {
    unmountPartitions: unmountPartitions,
    mountPartitions: mountPartitions,
    updatePartitions: updatePartitions,
    doPartitionsExist: doPartitionsExist
};
