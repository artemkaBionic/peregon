'use strict';
var shell = require('shelljs');
var partitions = require('./partitions');
var content = require('./content');


exports.prepareUsb = function(io, data, callback) {
    var device = data.id;
    var isUsbPrepared = false;
    try {
        partitions.updatePartitions(device);
        content.updateContent(device);
        isUsbPrepared = true;
    }
    catch (err) {
        console.error('Failed to prepare USB');
        console.error(err);
    }
    finally {
        unmountUSB(device);
        callback(isUsbPrepared);
    }
};

exports.readSession = function(io, data) {
    var device = data.id;
    var statusMountFolder = '/mnt/' + device + '4';
    var usbSessionFile = statusMountFolder + '/session.json';

    shell.mkdir(statusMountFolder);
    shell.exec('mount /dev/' + device + '4 ' + statusMountFolder);
    var usbSession = JSON.parse(fs.readFileSync(usbSessionFile, 'utf8'));
};
