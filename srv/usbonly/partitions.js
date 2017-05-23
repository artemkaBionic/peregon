'use strict';
var shell = require('shelljs');

shell.config.fatal = true;


exports.initMBR = function(device) {
    try {
        shell.mkdir('parted --script /dev/' + device + ' mklabel msdos');
    }
    catch (err) {
        return;
    }

};


exports.createXboxPartition = function(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary ntfs 0% 100M');
        shell.exec('mkfs.ntfs -f -L "XboxRefresh" /dev/'+ device + '1');
    }
    catch (err) {
        return;
    }


};


exports.createWinPartition = function(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary fat32 101M 2024M');
        shell.exec('mkfs.vfat -F32 -n "WinRefresh" /dev/' + device + '2');
        shell.exec('parted --script /dev/' + device + ' set 2 boot on');
    }
    catch (err) {
        return;
    }

};

exports.createMacPartition = function(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary hfs+ 2025M 10000M');
        shell.exec('mkfs.hfsplus -v "MacRefresh" /dev/'+ device +'3');
    }
    catch (err) {
        return;
    }

};

exports.createStatusPartition = function (device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary fat32 10001M 100%');
        shell.exec('mkfs.vfat -F32 -n "Status" /dev/' + device + '4');
    }
    catch (err) {
        return;
    }

};


