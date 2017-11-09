/**
 * Created by artem on 23.05.17.
 */
/*jslint node: true */
'use strict';
var config = require('../config.js');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var shell = require('shelljs');

function getCurrentVersion(versionFile) {
    return fs.readFileAsync(versionFile, 'utf8').then(function(data) {
        return data.trim();
    });
}

function getCurrentVersions() {
    var versions = [];
    versions.push(getCurrentVersion(config.winPeVersionFile));
    versions.push(getCurrentVersion(config.winPeAppVersionFile));
    versions.push(getCurrentVersion(config.windowsVersionFile));
    versions.push(getCurrentVersion(config.xboxVersionFile));
    versions.push(getCurrentVersion(config.macVersionFile));
    return Promise.all(versions).then(function(values) {
        return {
            'winpe': values[0],
            'winpe-app': values[1],
            'windows': values[2],
            'xbox': values[3],
            'mac': values[4]
        };
    });
}

function createVersionsFile(device) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    return getCurrentVersions().then(JSON.stringify).then(function(currentVersionsJson) {
        return fs.writeFileAsync(usbVersionsFile, currentVersionsJson);
    });
}

function getUsbVersions(device) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    return fs.readFileAsync(usbVersionsFile, 'utf8').then(JSON.parse);
}

module.exports = {
    getCurrentVersions: getCurrentVersions,
    createVersionsFile: createVersionsFile,
    getUsbVersions: getUsbVersions
};
