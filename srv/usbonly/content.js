'use strict';
var shell = require('shelljs');
shell.config.fatal = true;


exports.copyXboxFiles = function(device, xboxContent) {
    var xboxMountFolder = '/mnt/' + device + '1';
    shell.mkdir(xboxMountFolder);
    shell.exec('mount /dev/' + device + '1' + ' ' + xboxMountFolder);
    shell.exec('cp -Lr ' + xboxContent + ' ' + xboxMountFolder);
    shell.exec('umount ' + xboxMountFolder);
    shell.exec('rm -rf ' + xboxMountFolder);
};

exports.copyWinFiles = function(device, winContent) {
    var winMountFolder = '/mnt/' + device + '2';
    console.log(winMountFolder);
    shell.mkdir(winMountFolder);
    shell.exec('mount /dev/' + device + '2 ' + winMountFolder);
    console.log('cp -Lr ' + winContent + ' ' + winMountFolder);
    shell.exec('cp -Lr ' + winContent + ' ' + winMountFolder);
    shell.exec('mv ' + winMountFolder + '/EFI/Microsoft/Boot/BCD-USB ' + winMountFolder + '/EFI/Microsoft/Boot/BCD');
    shell.exec('umount ' + winMountFolder);
    shell.exec('rm -rf ' + winMountFolder);
};


exports.copyMacFiles = function(device, macContent) {
    console.log('copy mac files started');
    console.log('Mac upload started');
    shell.exec('dd bs=4M if=' + macContent + ' of=/dev/' + device + '3 && sync');
    console.log('Mac upload finished');
};
