'use strict';
var config = require('../config');
var partitions = require('./partitions');
var content = require('./content');
var fs = require('fs');
var versions = require('./versions');
var usbDrives = require('./usbCache');
exports.prepareUsb = function(io, data) {
    console.log('prepareUsb');
    var device = data.usb.id;
    var item = data.item;

    partitions.updatePartitions(device, function(err) {
        if (err) {
            console.error(err);
            partitions.unmountPartitions(device, function() {
                console.log('Error updating partitions');
                usbDrives.completeUsb({err: err, device: device});
                io.emit('usb-complete', {err: err, device: device});
            });
        } else {
            content.updateContent(io, device, item, function(err) {
                if (err) {
                    console.log('Error updating content');
                    console.log(err);
                }
                partitions.unmountPartitions(device, function() {
                    usbDrives.completeUsb({err: err, device: device});
                    io.emit('usb-complete', {err: err, device: device});
                });
            });
        }
    });
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
    var device = data.usb.id;
    var isSessionComplete = false;

    partitions.mountPartitions(device, function(err) {
        fs.readFile('/mnt/' + device + config.usbStatusPartition + '/session.json', 'utf8', function (err, data) {
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
