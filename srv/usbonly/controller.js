'use strict';
var config = require('../config');
var partitions = require('./partitions');
var content = require('./content');
var fs = require('fs');
var versions = require('./versions');
var usbDrives = require('./usbCache');
var Promise = require('bluebird');
var BlueBirdQueue = require('bluebird-queue');
exports.prepareUsb = function(io) {
    console.log('prepareUsb');
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].id){
            var device = devices[key];
            console.log(device);
            partitions.updatePartitions(device.id, function(err) {
                if (err) {
                    console.error(err);
                    partitions.unmountPartitions(device.id, function() {
                        console.log('Error updating partitions');
                        usbDrives.completeUsb({err: err, device: device.id});
                        io.emit('usb-complete', {err: err, device: device.id});
                    });
                } else {
                    content.updateContent(io, device.id, function(err) {
                        if (err) {
                            console.log('Error updating content');
                            console.log(err);
                        }
                        partitions.unmountPartitions(device.id, function() {
                            usbDrives.completeUsb({err: err, device: device.id});
                            io.emit('usb-complete', {err: err, device: device.id});
                        });
                    });
                }
            });
        }
    }
};
exports.isRefreshUsb = function(device, callback){
    //var device = data.usb.id;
    versions.getUsbVersions(device, function(err, res){
        if(err) {
            console.error(err);
            callback(err, null);
        } else {
            if (res === null) {
                callback(null, false);
            } else {
                callback(null, true);
            }
        }
    });
};
exports.readSession = function(io, data, callback) {
    console.log('readSession');
    var device = data.usb;
    var isSessionComplete = false;

    partitions.mountPartitions(device, function(err) {
        // if (isDevelopment) {
        //     logSession(session, 'Info', 'Checking ' + data.device.id +
        //         ' for evidence that the refresh completed successfully.');
        //     logSession(session, 'Info',
        //         'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
        //     console.log(
        //         'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
        //     setTimeout(function() {
        //         closeSession(session, true, callback);
        //     }, 3000);
        // } else {
        //     logSession(session, 'Info', 'Checking ' + data.device.id +
        //         ' for evidence that the refresh completed successfully.');
        //     var mountSource = '/dev/' + data.device.id + '1';
        //     var mountTarget = '/mnt/' + data.device.id + '1';
        //     fs.mkdir(mountTarget, function(err) {
        //         if (err && err.code !== 'EEXIST') {
        //             logSession(session, 'Error', 'Error creating directory ' +
        //                 mountTarget, err);
        //         } else {
        //             logSession(session, 'Info', 'Attempting to mount ' +
        //                 mountSource + ' to ' + mountTarget);
        //             var mount = childProcess.spawn('mount',
        //                 [mountSource, mountTarget]);
        //             mount.on('close', function(code) {
        //                 var systemUpdateDir = path.join(mountTarget,
        //                     '$SystemUpdate');
        //                 if (code !== 0) {
        //                     logSession(session,
        //                         'Error', 'Error, failed to mount ' +
        //                         mountSource + ' to ' +
        //                         mountTarget, 'Mount command failed with error code ' +
        //                         code);
        //                 } else {
        //                     logSession(session,
        //                         'Info', 'Successfully mounted ' + mountSource +
        //                         ' to ' + mountTarget);
        //                     var success = filesExist(systemUpdateDir, [
        //                         'smcerr.log',
        //                         'update.cfg',
        //                         'update.log',
        //                         'update2.cfg']);
        //                     rimraf(path.join(mountTarget, '*'), function(err) {
        //                         childProcess.spawn('umount', [mountTarget]);
        //                         closeSession(session, success, callback);
        //                     });
        //                 }
        //             });
        //         }
        //     });
        // }
        fs.readFile('/mnt/' + device + config.usbStatusPartition + 'sessions/' + '/*.json', 'utf8', function (err, data) {
            if (err) {
                if (err.code === 'ENOENT') {
                    callback(null, false);
                } else {
                    callback(err, null);
                }
            } else {
                try {
                    // Remove non-printable characters
                    data = data.replace(/[^\x20-\x7E]+/g, '');

                    var usbSession = JSON.parse(data);
                    console.log('Refresh Session details:');
                    console.log(usbSession);
                    isSessionComplete = usbSession.status === 'Success';
                } catch (err) {
                    console.log('Error reading session');
                    console.error(err);
                    callback(err, null);
                } finally {
                    try {
                        content.clearStatus(device);
                        //Disable EFI boot to prevent Refresh Station booting to USB
                        content.prepareRefreshType(device, 'none', function() {
                            partitions.unmountPartitions(device, function() {
                                callback(null, isSessionComplete);
                            });
                        });
                    } catch (err) {
                        console.log('Error finalizing reading sessions');
                        console.error(err);
                        callback(err, isSessionComplete);
                    }
                }
            }
        });
    });
};
exports.createItemFiles = function(item){
    var queue = new BlueBirdQueue({});
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].id) {
            queue.add(createItemFile(devices[key], item));
        }
    }
    return queue.start();
};
exports.clearItemFiles = function () {
    var queue = new BlueBirdQueue({});
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].id) {
            queue.add(clearItemFile(devices[key]));
        }
    }
    return queue.start();
};
function createItemFile(device, item){
    return new Promise(function(resolve, reject) {
        partitions.mountPartitions(device, function(err) {
            if (err) {
                partitions.unmountPartitions(device, function() {
                    reject(err);
                });
            } else {
                content.createItemFile(device, item, function(err) {
                    if (err) {
                        reject(err);
                    }
                    partitions.unmountPartitions(device, function(){
                        resolve();
                    });

                });
            }
        });
    });
}
function clearItemFile(device){
    return new Promise(function(resolve, reject) {
        partitions.mountPartitions(device, function(err) {
            if (err) {
                partitions.unmountPartitions(device, function(err){
                    reject(err);
                });
            } else {
                content.clearStatus(device);
                partitions.unmountPartitions(device, null);
                resolve();
            }
        });
    });
}
