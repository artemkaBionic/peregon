'use strict';
var shell = require('shelljs');
shell.config.fatal = true;

exports.copyXboxFiles = function(device, winContent) {
    var xboxMountFolder = device + '1';
    try {
        shell.mkdir('/mnt/'+ xboxMountFolder);
        shell.exec('mount /dev/' + device +'1' + ' /mnt/' + xboxMountFolder);
        shell.exec('cp -Lr /srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/* /mnt/'+ xboxMountFolder);
        shell.exec('umount /mnt/' + xboxMountFolder);
        shell.exec('rm -rf /mnt/' + xboxMountFolder);
    }
    catch (err) {
        return;
    }


};

exports.copyWinFiles = function(device, winContent) {
    var winMountFolder = '/mnt/' + device + '2';
    try {
        shell.mkdir(winMountFolder);
        shell.exec('mount /dev/' + device +'2 ' + winMountFolder);
        shell.exec('cp -Lr ' + winContent + ' ' + winMountFolder);
        shell.exec('mv ' + winMountFolder + '/EFI/Microsoft/Boot/BCD-USB ' + winMountFolder + '/EFI/Microsoft/Boot/BCD');
    }
    catch (err) {
        return;
    }


};


exports.copyMacFiles = function(device, macContent) {
    try {
        shell.exec('dd bs=4M if=' + macContent + ' of=/dev/'+ device + '3 && sync');
    }
    catch (err) {
        return;
    }

};
