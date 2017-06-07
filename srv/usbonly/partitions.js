'use strict';
var config = require('../config');
var os = require('os');
var shell = require('shelljs');


function mbrExists(device) {
    var deviceInfo = shell.exec('parted --script /dev/' + device + ' --machine print', {silent: true}).stdout.trim().split(os.EOL)[1].split(':');
    return deviceInfo[5] === 'msdos';
}

function partitionsExist(device) {
    var partitionsInfo = shell.exec('lsblk --output name,label,size --pairs /dev/' + device, {silent: true}).stdout.trim().split(os.EOL);
    return partitionsInfo.length === 5
        && partitionsInfo[1].indexOf('LABEL="XboxRefresh"') >= 0
        && partitionsInfo[2].indexOf('LABEL="WinRefresh"') >= 0
        && partitionsInfo[3].indexOf('LABEL="MacRefresh"') >= 0
        && partitionsInfo[4].indexOf('LABEL="Status"') >= 0
}

function isPartitioned(device) {
    return mbrExists(device) && partitionsExist(device);
}

function initMbr(device) {
    shell.exec('parted --script /dev/' + device + ' mklabel msdos');
}

function createXboxPartition(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary ntfs 0% 100M');
    shell.exec('mkfs.ntfs -f -L "XboxRefresh" /dev/' + device + config.usbXboxPartition);
}

function createWindowsPartition(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary fat32 101M 2024M');
    shell.exec('mkfs.vfat -F32 -n "WinRefresh" /dev/' + device + config.usbWindowsPartition);
}

function createMacPartition(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary hfs+ 2025M 10000M');
    shell.exec('mkfs.hfsplus -v "MacRefresh" /dev/' + device + config.usbMacPartition);
}

function createStatusPartition(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary fat32 10001M 100%');
    shell.exec('mkfs.vfat -F32 -n "Status" /dev/' + device + config.usbStatusPartition);
}

exports.unmountPartitions = function(device) {
    console.log('Unmounting USB device ' + device);
    shell.exec('umount /dev/' + device + '?', {silent: true});
    shell.rm('-rf', '/mnt/' + device + '?');
};

exports.mountPartitions = function(device) {
    exports.unmountPartitions(device);
    console.log('Mounting USB device ' + device);
    shell.mkdir('-p', [
        '/mnt/' + device + config.usbXboxPartition,
        '/mnt/' + device + config.usbWindowsPartition,
        '/mnt/' + device + config.usbStatusPartition]);
    shell.exec('mount /dev/' + device + config.usbXboxPartition + ' /mnt/' + device + config.usbXboxPartition);
    shell.exec('mount /dev/' + device + config.usbWindowsPartition + ' /mnt/' + device + config.usbWindowsPartition);
    shell.exec('mount /dev/' + device + config.usbStatusPartition + ' /mnt/' + device + config.usbStatusPartition);
};

exports.updatePartitions = function(device) {
    if (!isPartitioned(device)) {
        console.log('Initializing new USB device ' + device);
        initMbr(device);
        createXboxPartition(device);
        createWindowsPartition(device);
        createMacPartition(device);
        createStatusPartition(device);
    }
    exports.mountPartitions(device);
};
