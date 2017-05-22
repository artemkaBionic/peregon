'use strict';
var shell = require('shelljs');

var winContent = '/usr/share/tftpd/winpe/default/*';
var winContentdev = '/home/artem/WinPe/*';
var mountFolder = '/mnt/';
var macContentdev = '/home/artem/mac_hfs.img';
var xboxContent = '/';

shell.config.fatal = true;

function copyXboxFiles(device, winContent) {
    var xboxMountFolder = device;
    try {
        shell.mkdir('/mnt/'+ xboxMountFolder);
       // shell.exec('cp -Lr /srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/* /mnt/');
    }
    catch (err) {
        return;
    }


}

function copyMacFiles(device, macContent) {
    try {
        shell.exec('dd bs=4M if=' + macContent + ' of=/dev/'+ device + '4 && sync');
    }
    catch (err) {
        return;
    }

}


function copyWinFiles(device, winContent) {
    try {
        shell.exec('mount /dev/'+ device + '2 /mnt');
        shell.exec('cp -Lr ' + winContent + ' ' + '/mnt/' );
        shell.exec('mv /mnt/EFI/Microsoft/Boot/BCD-USB /mnt/EFI/Microsoft/Boot/BCD');
    }
    catch (err) {
        return;
    }


}


function createMacPartition(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary hfs+ 77% 100%');
        shell.exec('mkfs.hfsplus -v "MacRefresh" /dev/'+ device +'4');
    }
    catch (err) {
        return;
    }

}


function createStatusPartition(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary fat32 76% 77%');
        shell.exec('mkfs.vfat -F32 -n "Status" /dev/' + device + '3');
    }
    catch (err) {
        return;
    }

}



function createWinPartition(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mkpart primary ntfs 1% 76%');
        shell.exec('mkfs.ntfs -f -L "WinRefresh" /dev/' + device + '2');
    }
    catch (err) {
        return;
    }

}



function createXboxPartition(device) {
    try {
        shell.exec('parted --script /dev/'+ device + ' mklabel gpt');
        shell.exec('parted --script /dev/'+ device + ' mkpart primary ntfs 0% 1%');
        shell.exec('mkfs.ntfs -f -L "XboxRefresh" /dev/'+ device + '1');
    }
    catch (err) {
        return;
    }


}



exports.prepareUSB = function (data) {
    var device = 'sdd';
    try {
        shell.exec('mount /dev/'+ device + '3 /mnt');
        console.log('USB flash drive was used before');


    }
    catch (err) {
        createXboxPartition(device);
        createWinPartition(device);
        createStatusPartition(device);
        createMacPartition(device);
        copyXboxFiles(device, xboxContent);
        copyWinFiles(device, winContentdev);
        copyMacFiles(device, macContentdev);

    }






};

