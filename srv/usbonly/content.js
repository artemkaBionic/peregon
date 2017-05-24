'use strict';
var shell = require('shelljs');
shell.config.fatal = true;
// Add finally umount


exports.copyXboxFiles = function(device, xboxContent) {
    var xboxMountFolder = device + '1';
    try {
        shell.mkdir('/mnt/'+ xboxMountFolder);
        shell.exec('mount /dev/' + device +'1' + ' /mnt/' + xboxMountFolder);
        shell.exec('cp -Lr ' + xboxContent +  ' /mnt/'+ xboxMountFolder);

    }
    catch (err) {

        return;
    }
    finally {
        shell.exec('umount /mnt/' + xboxMountFolder);
        shell.exec('rm -rf /mnt/' + xboxMountFolder);
    }


};

exports.copyWinFiles = function(device, winContent) {
    var winMountFolder = '/mnt/' + device + '2';
    console.log(winMountFolder);
    try {
        shell.mkdir(winMountFolder);
        shell.exec('mount /dev/' + device +'2 ' + winMountFolder);
        console.log('cp -Lr ' + winContent + ' ' + winMountFolder);
        shell.exec('cp -Lr ' + winContent + ' ' + winMountFolder);
        shell.exec('mv ' + winMountFolder + '/EFI/Microsoft/Boot/BCD-USB ' + winMountFolder + '/EFI/Microsoft/Boot/BCD');


    }
    catch (err) {
        console.log(err);
        return;
    }
    finally {
        shell.exec('umount ' + winMountFolder );
        shell.exec('rm -rf ' + winMountFolder );
    }


};


exports.copyMacFiles = function(device, macContent) {
    console.log('copy mac files started');
    try {
        console.log('OSX upload started');
        shell.exec('dd bs=4M if=' + macContent + ' of=/dev/'+ device + '3 && sync');
        console.log('OSX upload finished');
    }
    catch (err) {
        console.log(err);
        return;
    }

};
