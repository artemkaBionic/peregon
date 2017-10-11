/**
 * Created by larry on 3/3/2016.
 */

var config = require('./config');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var childProcess = require('child_process');
var rimraf = require('rimraf');
var request = require('requestretry');
var uuid = require('uuid/v1');
var station = require('./station');
const usbDrives = require('./usbonly/usbCache');
const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost +
    '/api/inventorylookup/';
const SERIAL_LOOKUP_URL = 'https://' + config.apiHost + '/api/seriallookup/';
const API_URL = 'https://api2.basechord.com';
//const API_URL2 = 'http://localhost:3000';
const RESEND_SESSIONS_INTERVAL = 900000; // 15 minutes
var isDevelopment = process.env.NODE_ENV === 'development';
var result = null;
var sessions = require('./session_storage/sessions');
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var winston = require('winston');
exports.getSerialLookup = getSerialLookup;
exports.sessionStart = sessionStart;
exports.getItem = getItem;
exports.sessionUpdate = sessionUpdate;
exports.sessionFinish = sessionFinish;
exports.resendSessions = resendSessions;
exports.lockDevice = lockDevice;
exports.unlockDevice = unlockDevice;
exports.sessionUpdateItem = sessionUpdateItem;
exports.getAllUsbDrives = getAllUsbDrives;
exports.getLowestUsbInProgress = getLowestUsbInProgress;
exports.changeDeviceFormat = changeDeviceFormat;
//Periodically resend unsent sessions
resendSessions();
setInterval(function() {
    resendSessions();
}, RESEND_SESSIONS_INTERVAL);

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
                winston.log('info', 'Calling item lookup from Azure with Id: ' + id);
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

function sessionStart(sessionId, device, tmp, callback) {
    winston.log('info', 'Session:' + sessionId + ' started');
    var diagnose_only = false;
    var station_name = station.getName();
    station.getServiceTag(function(station_service_tag) {
        var newSession = {
            'start_time': new Date(),
            'end_time': null,
            'status': 'Incomplete',
            'diagnose_only': diagnose_only,
            'device': session_device,
            'station': {
                'name': station_name,
                'service_tag': station_service_tag
            },
            'logs': [],
            'tmp': tmp,
            'is_sent': false,
            '_id': sessionId
        };
        sessions.set(sessionId, newSession).then(function(session) {
            winston.log('info', 'Session with ID:' + sessionId + ' was inserted succesfully');
            callback(newSession);
        }).catch(function(err) {
            winston.log('error', 'Error while inserting session with ID:' + sessionId + ' Error:' + err);
            callback(null);
        });

    });
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

function sessionUpdate(session, level, message, details, callback) {
        if (typeof session === 'undefined') {
            winston.log('warn', 'sessionUpdate attempted for a session that is not started.');
        } else {
            sessions.updateSession(session);
            logSession(session, level, message, details);
        }
        callback(null, session);
}

function sessionUpdateItem(params, device) {
    return new Promise(function(resolve, reject) {
        sessions.sessionUpdateItem(params, device).then(function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
                //resendSessions();
            }
        }).catch(function(err) {
            winston.log('error', 'Something went wrong while updating session item for serial:' + err);
        });
    });

}

function sessionFinish(sessionId, data, callback) {
    //var session = sessions.get(sessionId);
    sessions.getSessionByParams({_id:sessionId}).then(function(session) {
        winston.log('info', 'A client requested to finish an ' + session.device.type + ' refresh of session id ' + session._id);
        closeSession(session, data.complete, callback);
    }).catch(function(err){
        winston.log('error', err);
    });

}

function logSession(session, level, message, details) {
        var sessionId = session._id;
        if (typeof details === 'undefined')
            details = '';

        var logEntry = {
            'timestamp': new Date(),
            'level': level,
            'message': message,
            'details': details
        };
        sessions.pushLogs(sessionId, logEntry);
}
//
function closeSession(session, success, callback) {
    winston.log('info', 'Closing session');
    session.end_time = new Date();
    if (success) {
        logSession(session, 'Info', 'Refresh completed successfully.');
        session.status = 'Success';
        sessions.updateSession(session);
    } else {
        logSession(session, 'Info', 'Refresh failed.');
        session.status = 'Fail';
        sessions.updateSession(session);
    }
    callback(session);
    sendSession(session);
}

function sendSession(session) {
    // deleting extra keys which added for client to continue session
    var sessionID = session._id;
    if (session.device.item_number){
        delete session.tmp;
        winston.log('info', 'Sending session with this ID:' + sessionID + ' for device: ' + session.device.item_number);
        return request({
            method: 'POST',
            url: API_URL + '/session',
            headers: {
                'Authorization': config.api2Authorization
            },
            body: session,
            rejectUnauthorized: false,
            json: true
        }).then(function(body) {
            // update status is sent
            session.is_sent = true;
            sessions.updateSession(session);
            winston.log('info', 'Session with this this ID:' + sessionID + ' was sent.');
        }).catch(function(error) {
            winston.log('error', 'ERROR: Unable to send session.');
            winston.log('error', error);
        });
    } else {
        winston.log('info', 'Session with this ID not sent:' + sessionID);
    }
}
function resendSessions() {
    winston.log('info', 'Attempting to resend unsent sessions');
    sessions.getSessionsByParams(
        {'device.item_number': {$exists: true, $ne: null}, 'is_sent': false, 'status': { $in: ["Fail", "Success"] }}).
        then(function(sessions) {
            for (var i = 0; i < sessions.length; i++) {
                sendSession(sessions[i]);
            }
        }).
        catch(function(err) {
            winston.log('error', err);
        });
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
    var session_device = {};
    for (var prop in device) {
        if (device.hasOwnProperty(prop)) {
            switch (prop) {
                case 'Sku':
                    session_device.sku = device.Sku;
                    break;
                case 'InventoryNumber':
                    session_device.item_number = device.InventoryNumber;
                    break;
                case 'Model':
                    session_device.model = device.Model;
                    break;
                case 'Manufacturer':
                    session_device.manufacturer = device.Manufacturer;
                    break;
                case 'Serial':
                    session_device.serial_number = device.Serial;
                    break;
                case 'Type':
                    session_device.type = device.Type;
                    break;
                case 'SubType':
                    session_device.sub_type = device.SubType;
                    break;
                case 'Description':
                    session_device.description = device.Description;
                    break;
                case 'numberOfAuto':
                    session_device.number_of_auto = device.numberOfAuto;
                    break;
                case 'numberOfManual':
                    session_device.number_of_manual = device.numberOfManual;
                    break;
                case 'failedTests':
                    session_device.failed_tests = device.failedTests;
                    break;
                case 'adbSerial':
                    session_device.adb_serial = device.adbSerial;
                    break;
            }
        }
    }
    return session_device;
}
