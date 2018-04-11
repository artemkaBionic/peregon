/**
 * Created by larry on 3/3/2016.
 */
/*jslint node: true */
'use strict';
var config = require('../config.js');
var request = require('requestretry');
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var winston = require('winston');
var InventoryItem = require('../models/inventoryItem');
var InventoryProduct = require('../models/inventoryProduct');
exports.getSerialLookup = getSerialLookup;
exports.getItem = getItem;
exports.lockDevice = lockDevice;
exports.unlockDevice = unlockDevice;

// Item lookup from our Mongo DB
function getItem(itemNumber) {
    winston.info('Getting item ' + itemNumber + ' from server');
    return new Promise(function(resolve) {
        InventoryItem.findOne({'item_number': itemNumber}).then(function(item) {
            if (item === null) {
                request({
                    uri: 'https://' + config.apiHost + '/inventory/items/' + itemNumber,
                    headers: {
                        'Authorization': config.apiAuthorization
                    },
                    rejectUnauthorized: false,
                    json: true
                }).then(function(response) {
                    winston.info('NodeJS server returned staus: ' + response.statusCode + ' body: ', response.body);
                    if (response.statusCode === 200) {
                        item = response.body;
                        InventoryItem.findOneAndUpdate({'item_number': item.item_number}, item, {upsert: true}, function(err) {
                            if (err) {
                                winston.error('Failed to save inventory item ' + item.item_number, err);
                            }
                        });
                        getProduct(item.sku).then(function(product) {
                            if (product === null) {
                                resolve(null);
                            } else {
                                item.product = product;
                                resolve(item);
                            }
                        });
                    } else {
                        winston.info('Item ' + itemNumber + ' not found.', response.body);
                        resolve(null);
                    }
                }).catch(function(err) {
                    winston.error('Error getting item', err);
                    throw(err);
                });
            } else {
                getProduct(item.sku).then(function(product) {
                    if (product === null) {
                        resolve(null);
                    } else {
                        item.product = product;
                        resolve(item);
                    }
                });
            }
        });
    });
}

function getProduct(sku) {
    winston.info('Getting product ' + sku + ' from server');
    return new Promise(function(resolve) {
        InventoryProduct.findOne({'sku': sku}).then(function(product) {
            if (product === null) {
                request({
                    uri: 'https://' + config.apiHost + '/inventory/products/' + sku,
                    headers: {
                        'Authorization': config.apiAuthorization
                    },
                    rejectUnauthorized: false,
                    json: true
                }).then(function(response) {
                    winston.info('NodeJS server returned staus: ' + response.statusCode + ' body: ', response.body);
                    if (response.statusCode === 200) {
                        var product = response.body;
                        InventoryProduct.findOneAndUpdate({sku: product.sku}, product, {upsert: true}, function(err) {
                            if (err) {
                                winston.error('Failed to save inventory product ' + product.sku, err);
                            }
                        });
                        resolve(product);
                    } else {
                        winston.info('Product ' + sku + ' not found.', response.body);
                        resolve(null);
                    }
                }).catch(function(err) {
                    winston.error('Error getting product', err);
                    throw(err);
                });
            } else {
                resolve(product);
            }
        });
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
        winston.error('Error locking device', err);
        throw(err);
    });
    winston.info('Lock request has been sent');
}
