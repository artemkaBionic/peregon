'use strict';
var config = require('../config');
var os = require('os');
var shell = require('shelljs');


function doesMbrExist(device, callback) {
    shell.exec('parted --script /dev/' + device + ' --machine print', {silent: true}, function(code, stdout, stderr) {
        if (code !== 0) {
            callback(new Error(stdout), null);
        } else {
            var deviceInfo = stdout.trim().split(os.EOL)[1].split(':');
            var mbrExists = deviceInfo[5] === 'msdos';
            callback(null, mbrExists);
        }
    });
}

function doPartitionsExist(device, callback) {
    shell.exec('lsblk --output name,label,size --pairs /dev/' + device, {silent: true}, function(code, stdout, stderr) {
        if (code !== 0) {
            callback(new Error(stderr), null);
        } else {
            var partitionsInfo = stdout.trim().split(os.EOL);
            var correctPartitionsExist = partitionsInfo.length === 5
                && partitionsInfo[1].indexOf('LABEL="XboxRefresh"') >= 0
                && partitionsInfo[2].indexOf('LABEL="WinRefresh"') >= 0
                && partitionsInfo[3].indexOf('LABEL="MacRefresh"') >= 0
                && partitionsInfo[4].indexOf('LABEL="Status"') >= 0;
            callback(null, correctPartitionsExist);
        }
    });
}

function checkPartitioning(device, callback) {
    doesMbrExist(device, function(err, mbrExists) {
        if(err) {
            callback(err, null);
        } else {
            if (mbrExists) {
                doPartitionsExist(device, function(err, partitionsExist) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, partitionsExist)
                    }
                });
            } else {
                callback(null, false);
            }
        }
    });
}

function unmountPartitions(device, callback) {
    console.log('unmountPartitions');
    console.log('Unmounting USB device ' + device);
    shell.exec('sync && umount /mnt/' + device + '?', {silent: true}, function(code, stdout, stderr) {
        shell.rm('-rf', '/mnt/' + device + '?');
        if (code !== 0) {
            callback(new Error(stderr));
        } else {
            callback(null);
        }
    });
}

function mountPartitions(device, callback) {
    console.log('mountPartitions');
    unmountPartitions(device, function() {
        console.log('Mounting USB device ' + device);
        shell.mkdir('-p', [
            '/mnt/' + device + config.usbXboxPartition,
            '/mnt/' + device + config.usbWindowsPartition,
            '/mnt/' + device + config.usbStatusPartition]);
        shell.exec('mount /dev/' + device + config.usbXboxPartition + ' /mnt/' + device + config.usbXboxPartition + ' && mount /dev/' + device + config.usbWindowsPartition + ' /mnt/' + device + config.usbWindowsPartition + ' && mount /dev/' + device + config.usbStatusPartition + ' /mnt/' + device + config.usbStatusPartition, function(code, stdout, stderr) {
            if (code !== 0) {
                callback(new Error(stderr));
            } else {
                callback(null);
            }
        });
    });
}

function updatePartitions(device, callback) {
    console.log('updatePartitions');
    checkPartitioning(device, function(err, isPartitioned) {
        if (err) {
            callback(err)
        } else {
            if (isPartitioned) {
                console.log('USB device ' + device + ' already partitioned correctly');
                mountPartitions(device, function(err) {
                    callback(err);
                });
            } else {
                // Get disk size
                shell.exec('parted --machine --script /dev/' + device + ' unit MiB print | awk -F: \'FNR==2{print $2}\'', function(code, stdout, stderr) {
                    if (code !== 0) {
                        callback(new Error(stdout));
                    } else {
                        var totalDiskSize = parseInt(stdout.split(os.EOL)[0].replace('MiB', ''));
                        var windowsPartitionSize = totalDiskSize - config.usbXboxPartitionSize - config.usbMacPartitionSize - config.usbStatusPartitionSize;
                        var partitionStart = 0;
                        var partitionEnd = 0;

                        console.log('Initializing new USB device ' + device);
                        // Initialize MBR
                        var script = 'mklabel msdos \\';
                        // Create Xbox Partition
                        partitionEnd = config.usbXboxPartitionSize;
                        script += '\nmkpart primary ntfs 0% ' + partitionEnd + 'MiB \\';
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
                                callback(new Error(stdout));
                            } else {
                                // Build Xbox File System
                                var command = 'mkfs.ntfs -f -L "XboxRefresh" /dev/' + device + config.usbXboxPartition;
                                // Build Windows File System
                                command += ' && mkfs.vfat -F32 -n "WinRefresh" /dev/' + device + config.usbWindowsPartition;
                                // Build Mac File System
                                command += ' && mkfs.hfsplus -v "MacRefresh" /dev/' + device + config.usbMacPartition;
                                // Build Status File System
                                command += ' && mkfs.vfat -F32 -n "Status" /dev/' + device + config.usbStatusPartition;
                                shell.exec(command, function(code, stdout, sdterr) {
                                    if (code !== 0) {
                                        callback(new Error(stderr));
                                    } else {
                                        mountPartitions(device, function(err) {
                                            callback(err);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

            }
        }
    });
}

module.exports = {
    unmountPartitions: unmountPartitions,
    mountPartitions: mountPartitions,
    updatePartitions: updatePartitions
};
