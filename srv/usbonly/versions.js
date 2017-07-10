/**
 * Created by artem on 23.05.17.
 */
var config = require('../config');
var fs = require('fs');


function getCurrentVersion(versionFile) {
    return new Promise(function(resolve, reject) {
        fs.readFile(versionFile, 'utf8', function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data.trim());
            }
        });
    });
}

exports.getCurrentVersions = function(callback) {
    var promises = [];
    promises.push(getCurrentVersion(config.winPeVersionFile));
    promises.push(getCurrentVersion(config.winPeAppVersionFile));
    promises.push(getCurrentVersion(config.windowsVersionFile));
    promises.push(getCurrentVersion(config.xboxVersionFile));
    promises.push(getCurrentVersion(config.macVersionFile));
    Promise.all(promises).then(function(values) {
        callback(null, {
            "winpe": values[0],
            "winpe-app": values[1],
            "windows": values[2],
            "xbox": values[3],
            "mac": values[4]
        });
    }, function(err) {
        callback(err, null);
    });
};

exports.createVersionsFile = function(device, callback) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    exports.getCurrentVersions(function(err, currentVersions) {
        if (err) {
            callback(err);
        } else {
            try {
                var json = JSON.stringify(currentVersions);
                fs.writeFile(usbVersionsFile, json, callback);
            } catch (err) {
                callback(err);
            }
        }
    });
};

exports.getUsbVersions = function(device, callback) {
    var usbVersionsFile = '/mnt/' + device + config.usbStatusPartition + '/versions.json';
    fs.readFile(usbVersionsFile, 'utf8', function(err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                callback(null, null);
            } else {
                callback(err, null);
            }
        } else {
            try {
                var json = JSON.parse(data);
                callback(null, json);
            } catch (err) {
                callback(err, null);
            }
        }
    });
};
