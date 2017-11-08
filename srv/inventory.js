/**
 * Created by larry on 3/3/2016.
 */
/*jslint node: true */
'use strict';
var config = require('./config');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var childProcess = require('child_process');
var rimraf = require('rimraf');
var request = require('requestretry');
var uuid = require('uuid/v1');
var station = require('./station');
var usbDrives = require('./usbonly/usbCache');
var INVENTORY_LOOKUP_URL = 'https://' + config.apiHost +
    '/api/inventorylookup/';
var SERIAL_LOOKUP_URL = 'https://' + config.apiHost + '/api/seriallookup/';
var API_URL = 'https://api2.basechord.com';
var isDevelopment = process.env.NODE_ENV === 'development';
var result = null;
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var winston = require('winston');
exports.getSerialLookup = getSerialLookup;
exports.getItem = getItem;
exports.lockDevice = lockDevice;
exports.unlockDevice = unlockDevice;
exports.getAllUsbDrives = getAllUsbDrives;
exports.getLowestUsbInProgress = getLowestUsbInProgress;
exports.changeDeviceFormat = changeDeviceFormat;

// Reverse lookup to Azure in case if not found in our Mongo DB
function getItemFromAzure(id, callback) {
    winston.log('info', 'Getting item from azure with Item Id: ' + id);
    request({
        url: INVENTORY_LOOKUP_URL + id,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.log('error', error);
            callback({error: error, item: null});
        }
        else {
            winston.log('info', 'Azure server returned: ');
            winston.log('info', body);
            callback({error: null, item: changeDeviceFormat(body)});
        }
    });
}

// Item lookup from our Mongo DB
function getItem(id, callback) {
    winston.log('info', API_URL + '/aarons/inventorylookup' + id);
    request({
        rejectUnauthorized: false,
        uri: API_URL + '/aarons/inventorylookup' + id,
        headers: {
            'Authorization': config.api2Authorization
        }
    }, function(error, response) {
        if (error) {
            winston.log('error', error);
            callback({error: error, item: null});
        }
        else {
            winston.log('info', 'NodeJS server returned: ');
            winston.log('info', response.body);
            var data = JSON.parse(response.body);
            if (data.message) {
                winston.log('info', 'Calling item lookup from Azure with Id: ' +
                    id);
                getItemFromAzure(id, callback);
            } else {
                callback({error: null, item: changeDeviceFormat(data)});
            }
        }
    });
}

function getSerialLookup(imei, callback) {
    request({
        url: SERIAL_LOOKUP_URL + imei,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.log('error', error);
            callback({error: error, item: null});
        }
        else {
            winston.log('info', 'Server returned: ');
            winston.log('info', body);
            callback({error: null, item: body});
        }
    });
}

function getAllUsbDrives() {
    return usbDrives.getAllUsbDrives();
}

function getLowestUsbInProgress() {
    return usbDrives.getLowestUsbInProgress();
}

function unlockDevice(imei, forService, callback) {
    winston.log('info', 'Unlocking imei ' + imei);
    request({
        method: 'POST',
        url: API_URL + '/unlockapi/unlock',
        headers: {
            'Authorization': config.api2Authorization
        },
        body: {'IMEI': imei, 'unlocked_for_service': forService},
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.log('error', error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    winston.log('info', 'Unlock request has been sent');
}

function lockDevice(imei, callback) {
    request({
        method: 'POST',
        url: API_URL + '/unlockapi/lock',
        headers: {
            'Authorization': config.api2Authorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.log('error', error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    winston.log('info', 'Lock request has been sent');
}

function filesExist(directory, files) {
    if (files.length === 0) {
        return true;
    } else {
        var filePath = path.join(directory, files.pop());
        try {
            var stats = fs.statSync(filePath);
            return stats.isFile() && filesExist(directory, files);
        }
        catch (e) {
            return false;
        }
    }
}

function changeDeviceFormat(device) {
    var newDevice = {};
    for (var prop in device) {
        if (device.hasOwnProperty(prop)) {
            switch (prop) {
                case 'Sku':
                    newDevice.sku = device.Sku;
                    break;
                case 'InventoryNumber':
                    newDevice.item_number = device.InventoryNumber;
                    break;
                case 'Model':
                    newDevice.model = device.Model;
                    break;
                case 'Manufacturer':
                    newDevice.manufacturer = device.Manufacturer;
                    break;
                case 'Serial':
                    newDevice.serial_number = device.Serial;
                    break;
                case 'Type':
                    newDevice.type = device.Type;
                    break;
                case 'SubType':
                    newDevice.sub_type = device.SubType;
                    break;
                case 'Description':
                    newDevice.description = device.Description;
                    break;
                case 'numberOfAuto':
                    newDevice.number_of_auto = device.numberOfAuto;
                    break;
                case 'numberOfManual':
                    newDevice.number_of_manual = device.numberOfManual;
                    break;
                case 'failedTests':
                    newDevice.failed_tests = device.failedTests;
                    break;
                case 'adbSerial':
                    newDevice.adb_serial = device.adbSerial;
                    break;
            }
        }
    }
    return newDevice;
}
