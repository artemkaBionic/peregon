/**
 * Created by artem on 23.05.17.
 */
var fs = require('fs');
var shell = require('shelljs');


function getCurrentVersion(versionFile) {
    return fs.readFileSync(versionFile, 'utf8').trim();
}

exports.getCurrentVersions = function() {
    var currentWinPeVersion = getCurrentVersion(config.winPeVersionFile);
    var currentXboxVersion = getCurrentVersion(config.xboxVersionFile);
    var currentMacVersion = getCurrentVersion(config.macVersionFile);
    return {
        "winpe": currentWinPeVersion,
        "xbox": currentXboxVersion,
        "mac": currentMacVersion
    };
};

exports.createVersionsFile = function(device) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    var currentWinPeVersion = getCurrentVersion(config.winPeVersionFile);
    var currentXboxVersion = getCurrentVersion(config.xboxVersionFile);
    var currentMacVersion = getCurrentVersion(config.macVersionFile);
    var versions = {
        "winpe": currentWinPeVersion,
        "xbox": currentXboxVersion,
        "mac": currentMacVersion
    };
    var json = JSON.stringify(versions);
    fs.writeFileSync(usbVersionsFile, json);
};


exports.getUsbVersions = function(device) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    try {
        return JSON.parse(fs.readFileSync(usbVersionsFile, 'utf8'));
    }
    catch (err) {
        return null;
    }
};
