'use strict';
var shell = require('shelljs');
shell.config.fatal = true;
//shell.config.silent = true;
var partitions = require('./partitions');
var content = require('./content');
var config = require('../config');
var versions = require('./versions');


exports.prepareUSB = function (io, data) {
    var device = data.id;
    var device = 'sdb';
    var statusMountFolder = '/mnt/' + device + '4';
    try {

        shell.mkdir(statusMountFolder);
        shell.exec('mount /dev/'+ device + '4 ' + statusMountFolder);
        console.log('USB flash drive was used before');

        console.log(statusMountFolder + '/versions.json');
        var usbVersions = versions.getUsbVersion(statusMountFolder + '/versions.json');
        var currentVersions = versions.getCurrentVersions();
        io.emit('usb-progress', {progress: 20});
        console.log(usbVersions);
        console.log(currentVersions);

        if (usbVersions.winpe !== currentVersions.winpe) {
            content.copyWinFiles(device, config.winContent);
            versions.createVersionsFile(device);

        }
        else if (usbVersions.xbox !== currentVersions.xbox) {
            console.log('copy new xbox files');
            content.copyXboxFiles(device, config.xboxContent);
            versions.createVersionsFile(device);

        }
        else if (usbVersions.mac !== currentVersions.mac) {
            content.copyMacFiles(device, config.macContent);
            versions.createVersionsFile(device);

        }
        io.emit('usb-progress', {progress: 80});

        shell.exec('umount ' + statusMountFolder);
        io.emit('usb-complete');


    }
    catch (err) {

       // partitions.initMBR(device);
        console.log('Kiosk: MBR initialized');
        io.emit('usb-progress', {progress: 5});
      //  partitions.createXboxPartition(device);
        console.log('Kiosk: XBOX partition was created');
        io.emit('usb-progress', {progress: 5});
     //   partitions.createWinPartition(device);
        console.log('Kiosk: Win partition was created');
        io.emit('usb-progress', {progress: 5});
     //   partitions.createMacPartition(device);
        console.log('Kiosk: Mac partition was created');
        io.emit('usb-progress', {progress: 5});
     //   partitions.createStatusPartition(device);
        console.log('Kiosk: Status partition was created');
        io.emit('usb-progress', {progress: 5});
     //   content.copyXboxFiles(device, config.xboxContent);
        console.log('Kiosk: XBOX files was copied');
        io.emit('usb-progress', {progress: 10});
     //   content.copyWinFiles(device, config.winContent);
        console.log('Kiosk: Win files was copied');
        io.emit('usb-progress', {progress: 30});
     //   content.copyMacFiles(device, config.macContent);
        console.log('Kiosk: Mac files was copied');
        io.emit('usb-progress', {progress: 30});
      //  versions.createVersionsFile(device);
        console.log('Kiosk: Versions file was created');
        io.emit('usb-progress', {progress: 5});
    }
    finally {
       // io.emit('usb-complete');
        console.log('here');

     //   shell.exec('rm -rf ' + statusMountFolder);
    }


};


exports.readSession = function (io, data) {
   // var device = data.id;
    var statusMountFolder = '/mnt/' + device + '4';
    var usbSessionFile = statusMountFolder + '/session.json';
    var device = 'sdb';

    try {
        shell.mkdir(statusMountFolder);
        shell.exec('mount /dev/'+ device + '4 ' + statusMountFolder);
        var usbSession = JSON.parse(fs.readFileSync(usbSessionFile, 'utf8'));


    }
    catch (err) {
        throw new Error;

    }



};
