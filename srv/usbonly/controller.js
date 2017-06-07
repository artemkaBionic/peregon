'use strict';
var config = require('../config');
var shell = require('shelljs');
var partitions = require('./partitions');
var content = require('./content');
var fs = require('fs');


exports.prepareUsb = function(io, data, callback) {
    var device = data.usb.id;
    var refreshType = data.item.Type;
    var isUsbPrepared = false;
    try {
        partitions.updatePartitions(device);
        content.updateContent(device, refreshType);
        isUsbPrepared = true;
    }
    catch (err) {
        console.error(err);
    }
    finally {
        try {
            partitions.unmountPartitions(device);
            callback(isUsbPrepared);
        } catch (err) {
            console.error(err);
        }
    }
};

exports.readSession = function(io, data, callback) {
    var device = data.usb.id;
    var isSessionComplete = false;

    try {
        partitions.mountPartitions(device);
        var usbSession = JSON.parse(fs.readFileSync('/mnt/' + device + config.usbStatusPartition + '/session.json', 'utf8'));
        console.log('Refresh Session details:');
        console.log(usbSession);
        isSessionComplete = usbSession.status === 'Success';
    } catch (err) {
        console.error(err);
    } finally {
        try {
            content.clearStatus(device);
            //Disable EFI boot to prevent Refresh Station booting to USB
            content.prepareRefreshType(device, 'none');
            partitions.unmountPartitions(device);
            callback(isSessionComplete);
        } catch (err) {
            console.error(err);
        }
    }
};
