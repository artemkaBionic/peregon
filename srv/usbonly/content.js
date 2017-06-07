'use strict';
var config = require('../config');
var shell = require('shelljs');
var versions = require('./versions');

function copyXboxFiles(device) {
    console.log('Copying Xbox files');
    shell.cp('-Lr', config.xboxContent, '/mnt/' + device + config.usbXboxPartition);
}

function copyWinPeFiles(device) {
    console.log('Copying Windows files');
    shell.cp('-Lr', config.winPeContent, '/mnt/' + device + config.usbWindowsPartition);
}

function copyMacFiles(device) {
    console.log('Copying Mac files');
    shell.exec('dd bs=4M if=' + config.macContent + ' of=/dev/' + device + config.usbMacPartition + ' && sync');
}

exports.prepareRefreshType = function(device, refreshType) {
    console.log('Preparing USB for ' + refreshType + ' refresh');
    if (refreshType === 'Windows' || refreshType === 'WindowsUsb') {
        //Enable Windows boot
        shell.exec('parted --script /dev/' + device + ' set ' + config.usbWindowsPartition + ' boot on');
        shell.mv('/mnt/' + device + config.usbWindowsPartition + '/EFI/Boot/bootx64.disabled', '/mnt/' + device + config.usbWindowsPartition + '/EFI/Boot/bootx64.efi');
    } else {
        //Disable Windows boot
        shell.exec('parted --script /dev/' + device + ' set ' + config.usbWindowsPartition + ' boot off');
        shell.mv('/mnt/' + device + config.usbWindowsPartition + '/EFI/Boot/bootx64.efi', '/mnt/' + device + config.usbWindowsPartition + '/EFI/Boot/bootx64.disabled');
    }
};

exports.updateContent = function(device, refreshType) {
    var currentVersions = versions.getCurrentVersions();
    var usbVersions = versions.getUsbVersions(device);

    if (usbVersions === null || usbVersions.xbox !== currentVersions.xbox)
        copyXboxFiles(device);
    if (usbVersions === null || usbVersions.winpe !== currentVersions.winpe)
        copyWinPeFiles(device);
    if (usbVersions === null || usbVersions.mac !== currentVersions.mac)
        copyMacFiles(device, config.macContent);

    console.log('Device ' + device + ' content update is complete.');
    versions.createVersionsFile(device);
    exports.prepareRefreshType(device, refreshType);
};

exports.clearStatus = function(device) {
    //Remove Xbox Refresh status files
    shell.rm([
        '/mnt/' + device + config.usbXboxPartition + '/$SystemUpdate/smcerr.log',
        '/mnt/' + device + config.usbXboxPartition + '/$SystemUpdate/update.cfg',
        '/mnt/' + device + config.usbXboxPartition + '/$SystemUpdate/update.log',
        '/mnt/' + device + config.usbXboxPartition + '/$SystemUpdate/update2.cfg']);
    //Remove Windows and Mac Refresh status files
    shell.rm([
        '/mnt/' + device + config.usbStatusPartition + '/refresh.log',
        '/mnt/' + device + config.usbStatusPartition + '/session.json',
        '/mnt/' + device + config.usbStatusPartition + '/system-info.txt']);
};
