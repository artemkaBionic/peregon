/**
 * Created by larry on 3/3/2016.
 */
/*jslint node: true */
'use strict';
var config = require('./config.js');
var path = require('path');
var fs = require('fs');
var request = require('requestretry');
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var winston = require('winston');
exports.getSerialLookup = getSerialLookup;
exports.getItem = getItem;
exports.lockDevice = lockDevice;
exports.unlockDevice = unlockDevice;

// Item lookup from our Mongo DB
function getItem(id, callback) {
    winston.info('Getting item ' + id + ' from server');
    request({
        rejectUnauthorized: false,
        uri: 'https://' + config.apiHost + '/inventory/' + id,
        headers: {
            'Authorization': config.apiAuthorization
        }
    }, function(error, response) {
        if (error) {
            winston.error('Error getting item', error);
            callback({error: error, item: null});
        }
        else {
            winston.info('NodeJS server returned staus: ' + response.statusCode + ' body: ', response.body);
            if (response.statusCode === 200) {
                callback({error: null, item: JSON.parse(response.body)});
            } else {
                winston.info('Item ' + id + ' not found.');
                callback({error: 'Item not found', item: null});
            }
        }
    });
}

function getSerialLookup(serial, callback) {
    winston.info('Getting item from server with serial number ' + serial);
    request({
        url: 'https://' + config.apiHost + '/inventory/serial_number/' + serial,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.error('Error getting item by Serial: ', error);
            callback({error: error, item: null});
        }
        else {
            winston.info('Server returned: ', body);
            callback({error: null, item: body});
        }
    });
}

function unlockDevice(imei, forService, callback) {
    winston.info('Unlocking imei ' + imei);
    request({
        method: 'POST',
        url: 'https://' + config.apiHost + '/unlockapi/unlock',
        headers: {
            'Authorization': config.apiAuthorization
        },
        body: {'IMEI': imei, 'unlocked_for_service': forService},
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.error('Error unlocking device', error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    winston.info('Unlock request has been sent');
}

function lockDevice(imei, callback) {
    request({
        method: 'POST',
        url: 'https://' + config.apiHost + '/unlockapi/lock',
        headers: {
            'Authorization': config.apiAuthorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            winston.error('Error locking device', error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    winston.info('Lock request has been sent');
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
