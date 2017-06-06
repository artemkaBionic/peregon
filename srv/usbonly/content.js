'use strict';
var shell = require('shelljs');
var versions = require('./versions');

function copyXboxFiles(device) {
    console.log('Copy Xbox files');
    shell.exec('cp -Lr ' + config.xboxContent + ' /mnt/' + device + config.usbXboxPartition);
}

function copyWinPeFiles(device) {
    console.log('Copy Windows files');
    shell.exec('cp -Lr ' + config.winPeContent + ' /mnt/' + device + config.usbWindowsPartition);
}

function copyMacFiles(device) {
    console.log('Copy Mac files');
    shell.exec('dd bs=4M if=' + config.macContent + ' of=/dev/' + device + config.usbMacPartition + ' && sync');
}

exports.updateContent = function(device) {
    var currentVersions = versions.getCurrentVersions();
    var usbVersions = versions.getUsbVersions(device);

    if (usbVersions.xbox !== currentVersions.xbox)
        copyXboxFiles(device);
    if (usbVersions.winpe !== currentVersions.winpe)
        copyWinPeFiles(device);
    if (usbVersions.mac !== currentVersions.mac)
        copyMacFiles(device, config.macContent);

    console.log('Device ' + device + ' content update is complete.');
    versions.createVersionsFile(device);
};
