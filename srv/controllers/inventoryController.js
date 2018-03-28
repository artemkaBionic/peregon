/**
 * Created by larry on 3/3/2016.
 */
/*jslint node: true */
'use strict';
var config = require('../config.js');
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
function getItem(id) {
        winston.info('Getting item ' + id + ' from server');
        return request({
            uri: 'https://' + config.apiHost + '/inventory/items/' + id,
            headers: {
                'Authorization': config.apiAuthorization
            },
            rejectUnauthorized: false,
            json: true
        }).then(function(response) {
            return new Promise(function(resolve, reject) {
                winston.info('NodeJS server returned staus: ' + response.statusCode + ' body: ', response.body);
                if (response.statusCode === 200) {
                    resolve(response.body);
                } else {
                    winston.info('Item ' + id + ' not found.', response.body);
                    resolve(null);
                }
            });
        }).catch(function(err) {
            winston.error('Error getting item', err);
            throw(err);
        });
}

function getSerialLookup(serial) {
    winston.info('Getting item from server with serial number ' + serial);
    return request({
        url: 'https://' + config.apiHost + '/inventory/items/serial_number/' + serial,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }).then(function(response) {
        return new Promise(function(resolve) {
            if (response.statusCode === 200) {
                resolve(response.body);
            } else {
                winston.info('Item with serial ' + serial + ' not found.', response.body);
                resolve(null);
            }
        });
    }).catch(function(err) {
        winston.error('Error getting item by Serial,', err);
        throw(err);
    });
}

function unlockDevice(imei, forService) {
    winston.info('Unlocking imei ' + imei);
    return request({
        method: 'POST',
        url: 'https://' + config.apiHost + '/unlockapi/unlock',
        headers: {
            'Authorization': config.apiAuthorization
        },
        body: {'IMEI': imei, 'unlocked_for_service': forService},
        rejectUnauthorized: false,
        json: true
    }).then(function(response) {
        return new Promise(function(resolve, reject) {
            if (response.statusCode === 200) {
                resolve(response.body);
            } else {
                winston.info('Failed to unlock device with imei ' + imei);
                reject(new Error(response.body.error));
            }
        });
    }).catch(function(err) {
        winston.error('Error unlocking device', err);
        throw(err);
    });
}

function lockDevice(imei) {
    request({
        method: 'POST',
        url: 'https://' + config.apiHost + '/unlockapi/lock',
        headers: {
            'Authorization': config.apiAuthorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }).then(function(response) {
        return new Promise(function(resolve, reject) {
            if (response.statusCode === 200) {
                resolve(response.body);
            } else {
                winston.info('Failed to lock device with imei ' + imei);
                reject(new Error(response.body.error));
            }
        });
    }).catch(function(err) {
        winston.error('Error locking device', error);
        throw(err);
    });
    winston.info('Lock request has been sent');
}
