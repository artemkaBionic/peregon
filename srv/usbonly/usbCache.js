/*jslint node: true */
'use strict';
var winston = require('winston');
var usbDrives = {};

function isEmptyObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}

exports.add = function (key, device) {
    winston.info('Adding this device to usb cache:' + key);
    usbDrives[key] = device;
    usbDrives[key].updatePromise = null;
};

exports.remove = function (key) {
    this.cancelUpdate(key);
    delete usbDrives[key];
};

exports.getAllUsbDrives = function () {
    return new Promise(function (resolve) {
        var drives = usbDrives;
        drives.usbData = {};
        drives.usbData.numberOfDevices = 0;
        drives.usbData.notReadyDevices = 0;
        drives.usbData.inProgressDevices = 0;
        drives.usbData.readyDevices = 0;
        drives.usbData.failedDevices = 0;
        drives.lowestProgress = 100;
        for (var key in drives) {
            if (drives.hasOwnProperty(key)) {
                if (drives[key].status) {
                    drives.usbData.numberOfDevices++;
                }
                if (drives.usbData.numberOfDevices !== 0) {
                    if (drives[key].status === 'not_ready') {
                        drives.usbData.notReadyDevices++;
                    } else if (drives[key].status === 'in_progress') {
                        drives.usbData.inProgressDevices++;
                        if (usbDrives[key].progress < drives.lowestProgress) {
                            drives.lowestProgress = usbDrives[key].progress;
                        }
                    } else if (drives[key].status === 'ready') {
                        drives.usbData.readyDevices++;
                    } else if (drives[key].status === 'failed') {
                        drives.usbData.failedDevices++;
                    }
                }
                if (drives[key].size < 30000000000) {
                    drives.usbData.isSmallUsbDriveInserted = true;
                }
            }
        }
        // statuses for front-end
        if (drives.usbData.notReadyDevices > 0) {
            drives.usbData.status = 'newBootDevice';
        } else if (drives.usbData.inProgressDevices > 0) {
            drives.usbData.status = 'bootDevicesProcessing';
        } else if (drives.usbData.failedDevices > 0) {
            drives.usbData.status = 'bootDevicesFailed';
        } else if (drives.usbData.numberOfDevices === 0) {
            drives.usbData.status = 'noBootDevices';
        } else {
            drives.usbData.status = 'bootDevicesReady';
        }
        resolve(drives);
    });
};

exports.startUpdate = function (key, promise) {
    usbDrives[key].updatePromise = promise;
};

exports.endUpdate = function (key) {
    if (usbDrives.hasOwnProperty(key)) {
        usbDrives[key].updatePromise = null;
    }
};

exports.cancelUpdate = function (key) {
    if (usbDrives[key].updatePromise) {
        usbDrives[key].updatePromise.cancel();
        usbDrives[key].updatePromise = null;
    }
};

exports.updateProgress = function (key, progress) {
    winston.info('Updating progress for usb ' + key);
    if (usbDrives.hasOwnProperty(key)) {
        usbDrives[key].status = 'in_progress';
        usbDrives[key].progress = progress;
    }
};

exports.finishProgress = function (key) {
    winston.info('Finishing progress for usb ' + key);
    if (usbDrives.hasOwnProperty(key)) {
        usbDrives[key].status = 'ready';
        usbDrives[key].progress = 100;
    }
};

exports.setStatus = function (key, status) {
    winston.info('Setting status ' + status + ' for usb ' + key);
    if (usbDrives.hasOwnProperty(key)) {
        usbDrives[key].status = status;
        usbDrives[key].progress = 0;
    }
};

exports.getLowestUsbProgress = function () {
    return new Promise(function (resolve) {
        winston.info('Getting lowest usb in progress');
        var lowestProgress = 100;
        for (var key in usbDrives) {
            if(usbDrives.hasOwnProperty(key) && usbDrives[key].status === 'in_progress' && usbDrives[key].progress < lowestProgress) {
                lowestProgress = usbDrives[key].progress;
            }
        }
        resolve(lowestProgress);
    });
};
