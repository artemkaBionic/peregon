/*jslint node: true */
'use strict';
var winston = require('winston');

function UsbCache() {
    this._usbDrives = {};
}

Object.setPrototypeOf(UsbCache.prototype, Object.prototype);

UsbCache.prototype.set = function(key, device) {
    winston.info('Adding this device to usb cache:' + key);
    this._usbDrives[key] = device;
};

UsbCache.prototype.delete = function(key) {
    delete this._usbDrives[key];
};

UsbCache.prototype.getAllUsbDrives = function() {
    // return this._usbDrives;
    var usbDrives = this._usbDrives;
    usbDrives.usbData = {};
    usbDrives.usbData.numberOfDevices = 0;
    usbDrives.usbData.notReadyDevices = 0;
    usbDrives.usbData.inProgressDevices = 0;
    usbDrives.usbData.readyDevices = 0;
    for (var key in usbDrives) {
        if (usbDrives.hasOwnProperty(key)) {
            if (usbDrives[key].status) {
                usbDrives.usbData.numberOfDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 &&
                usbDrives[key].status === 'not_ready') {
                usbDrives.usbData.notReadyDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 &&
                usbDrives[key].status === 'in_progress') {
                usbDrives.usbData.inProgressDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 &&
                usbDrives[key].status === 'ready') {
                usbDrives.usbData.readyDevices++;
            }
            if (usbDrives[key].size < 30000000000) {
                usbDrives.usbData.isSmallUsbDriveInserted = true;
            }
        }
    }
    // statuses for front-end
    if (usbDrives.usbData.notReadyDevices > 0) {
        usbDrives.usbData.status = 'newBootDevice';
    } else if (usbDrives.usbData.inProgressDevices > 0) {
        usbDrives.usbData.status = 'bootDevicesProcessing';
    } else if (usbDrives.usbData.numberOfDevices === 0) {
        usbDrives.usbData.status = 'noBootDevices';
    } else {
        usbDrives.usbData.status = 'bootDevicesReady';
    }
    return usbDrives;
};
UsbCache.prototype.updateProgress = function(key, progress) {
    winston.info('Updating progress for usb ' + key);
    if (this._usbDrives.hasOwnProperty(key)) {
        this._usbDrives[key].status = 'in_progress';
        this._usbDrives[key].progress = progress;
    }
};
UsbCache.prototype.finishProgress = function(key) {
    winston.info('Finishing progress for usb ' + key);
    if (this._usbDrives.hasOwnProperty(key)) {
        this._usbDrives[key].status = 'ready';
        this._usbDrives[key].progress = 100;
    }
};
UsbCache.prototype.setStatus = function(key, status) {
    winston.info('Setting status ' + status + ' for usb ' + key);
    if (this._usbDrives.hasOwnProperty(key)) {
        this._usbDrives[key].status = status;
        this._usbDrives[key].progress = 0;
    }
};
UsbCache.prototype.getLowestUsbInProgress = function() {
    winston.info('Getting lowest usb in progress');
    var obj = this._usbDrives;
    if (!isEmptyObject(obj)) {
        // convert object to array to use reduce method;
        var usbDrives = Object.keys(obj).
            map(function(key) { return obj[key]; });

        // getting all usb drives which are in progress
        var usbDrivesInProgress = usbDrives.filter(function(obj) {
            return obj.status === 'in_progress';
        });
        // searching for min in all usb in progress;
        if (usbDrivesInProgress.length > 0) {
            var min = usbDrivesInProgress.reduce(function(prev, current) {
                return (prev.progress < current.progress) ? prev : current;
            });//returns object with min progress;
            return min;
        } else {
            return null;
        }
    }
    return null;
};

function isEmptyObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
}

module.exports = new UsbCache();

