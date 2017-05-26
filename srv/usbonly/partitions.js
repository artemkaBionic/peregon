'use strict';
var shell = require('shelljs');

shell.config.fatal = true;


exports.initMBR = function(device) {
    shell.exec('parted --script /dev/' + device + ' mklabel msdos');
};

exports.createXboxPartition = function(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary ntfs 0% 100M');
    shell.exec('mkfs.ntfs -f -L "XboxRefresh" /dev/' + device + '1');
};

exports.createWinPartition = function(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary fat32 101M 2024M');
    shell.exec('mkfs.vfat -F32 -n "WinRefresh" /dev/' + device + '2');
    shell.exec('parted --script /dev/' + device + ' set 2 boot on');
};

exports.createMacPartition = function(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary hfs+ 2025M 10000M');
    shell.exec('mkfs.hfsplus -v "MacRefresh" /dev/' + device + '3');
};

exports.createStatusPartition = function(device) {
    shell.exec('parted --script /dev/' + device + ' mkpart primary fat32 10001M 100%');
    shell.exec('mkfs.vfat -F32 -n "Status" /dev/' + device + '4');
};
