'use strict';
var shell = require('shelljs');
shell.config.fatal = true;
var partitions = require('./partitions');
var content = require('./content');
var config = require('../config');
var versions = require('./versions');





exports.prepareUSB = function (data) {
    var device = 'sdd';
    try {
        var statusMountFolder = '/mnt/' + device + '4';
        shell.exec('mount /dev/'+ device + '4 ' + statusMountFolder);
        console.log('USB flash drive was used before');
        var usbVersions = versions.getUsbVersion(statusMountFolder + '/versions.json');
        var currentVersions = versions.getCurrentVersions();
        
    }
    catch (err) {

        /*
        partitions.initMBR(device);
        partitions.createXboxPartition(device);
        partitions.createWinPartition(device);
        partitions.createMacPartition(device);
        partitions.createStatusPartition(device);
        content.copyXboxFiles(device, config.xboxContent);
        content.copyWinFiles(device, config.winContent);
        content.copyMacFiles(device, config.macContent);
        versions.createVersionsFile(device);
        */


    }


};


