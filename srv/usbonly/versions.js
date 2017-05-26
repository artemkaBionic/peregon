/**
 * Created by artem on 23.05.17.
 */
var fs = require('fs');
var config = require('../config');
var shell = require('shelljs');
shell.config.fatal = true;


function getWinpeVersion(winVersionFile) {
    return fs.readFileSync(winVersionFile, 'utf8').trim();
}

function getXboxVersion(xboxVersionFile) {
    return fs.readFileSync(xboxVersionFile, 'utf8').trim();
}

function getMacVersion(macVersionFile) {
    return fs.readFileSync(macVersionFile, 'utf8').trim();
}

exports.getCurrentVersions = function() {
    var currentWinVersion = getWinpeVersion(config.winVersionFile);
    var currentXboxVersion = getXboxVersion(config.xboxVersionFile);
    var currentMacVersion = getMacVersion(config.macVersionFile);
    return {
        "winpe": currentWinVersion,
        "xbox": currentXboxVersion,
        "mac": currentMacVersion
    };
};

exports.createVersionsFile = function(device) {
    var statusMountFolder = '/mnt/' + device + '4';
    var currentWinVersion = getWinpeVersion(config.winVersionFile);
    var currentXboxVersion = getXboxVersion(config.xboxVersionFile);
    var currentMacVersion = getMacVersion(config.macVersionFile);
    var versions = {
        "winpe": currentWinVersion,
        "xbox": currentXboxVersion,
        "mac": currentMacVersion
    };
    // console.log(versions);
    var json = JSON.stringify(versions);
    // shell.mkdir(statusMountFolder);
    shell.exec('mount /dev/' + device + '4 ' + statusMountFolder);
    fs.writeFileSync(statusMountFolder + '/versions.json', json);
    shell.exec('umount ' + statusMountFolder);
    shell.exec('rm -rf ' + statusMountFolder);
};


exports.getUsbVersion = function(usbVersionsFile) {
    return JSON.parse(fs.readFileSync(usbVersionsFile, 'utf8'));
};
