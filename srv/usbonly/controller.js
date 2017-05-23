'use strict';
var shell = require('shelljs');
shell.config.fatal = true;
var partitions = require('./partitions');
var content = require('./content');
var config = require('../config');
var versions = require('./versions');





exports.prepareUSB = function (data) {
    var device = 'sdb';
    var statusMountFolder = '/mnt/' + device + '4';
    try {

        shell.mkdir(statusMountFolder);
        shell.exec('mount /dev/'+ device + '4 ' + statusMountFolder);
        console.log('USB flash drive was used before');

        console.log(statusMountFolder + '/versions.json');
        var usbVersions = versions.getUsbVersion(statusMountFolder + '/versions.json');
        var currentVersions = versions.getCurrentVersions();
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


    }
    catch (err) {

       // partitions.initMBR(device);
       // partitions.createXboxPartition(device);

       // partitions.createWinPartition(device);

        //partitions.createMacPartition(device);

        //partitions.createStatusPartition(device);

       // content.copyXboxFiles(device, config.xboxContent);

        //content.copyWinFiles(device, config.winContent);

        //content.copyMacFiles(device, config.macContent);
        versions.createVersionsFile(device);



    }
    finally {
        shell.exec('umount ' + statusMountFolder);
        shell.exec('rm -rf ' + statusMountFolder);
    }


};


