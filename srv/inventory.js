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
//exports.getSessions = getSessions;
//exports.getSession = getSession;
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
exports.getLowestUsbProgress = getLowestUsbProgress;
//Periodically resend unsent sessions
resendSessions();
setInterval(function() {
    resendSessions();
}, RESEND_SESSIONS_INTERVAL);

// Reverse lookup to Azure in case if not found in our Mongo DB
function getItemFromAzure(id, callback) {
    console.log('Getting item from azure with Item Id: ' + id);
    request({
        url: INVENTORY_LOOKUP_URL + id,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function(error, response, body) {
        if (error) {
            console.error(error);
            callback({error: error, item: null});
        }
        else {
            console.log('Azure server returned: ');
            console.log(body);
            callback({error: null, item: body});
        }
    });
}

// Item lookup from our Mongo DB
function getItem(id, callback) {
    console.log(API_URL + '/aarons/inventorylookup' + id);
    request({
        rejectUnauthorized: false,
        uri: API_URL + '/aarons/inventorylookup' + id,
        headers: {
            'Authorization': config.api2Authorization
        }
    }, function(error, response) {
        if (error) {
            console.error(error);
            callback({error: error, item: null});
        }
        else {
            console.log('NodeJS server returned: ');
            console.log(response.body);
            if (!JSON.parse(response.body).message) {
                callback({error: null, item: JSON.parse(response.body)});
            } else {
                console.log('Calling reverse lookup from Azure with Id: ' + id);
                getItemFromAzure(id, callback);
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
            console.error(error);
            callback({error: error, item: null});
        }
        else {
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, item: body});
        }
    });
}
//
// // function getSessions(filter) {
// //     return sessions.getFiltered(filter);
// // }
// // function getAllSessions(){
// //     return sessions.getAllSessions();
// // }
// function getSession(sessionId) {
//     return sessions.get(sessionId);
// }

function getAllUsbDrives() {
    return usbDrives.getAllUsbDrives();
}

function getLowestUsbProgress() {
    return usbDrives.getLowestUsbProgress();
}

function sessionStart(sessionId, device, callback) {
    console.log('Session:' + sessionId + ' started');
    var diagnose_only = false;
    var session_device = changeDeviceFormat(device);
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
            'is_sent': false,
            '_id': sessionId
        };
        sessions.set(sessionId, newSession);
        callback();
    });
}

function unlockDevice(imei, forService, callback) {
    console.log('Unlocking imei ' + imei);
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
            console.error(error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    console.log('Unlock request has been sent');
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
            console.error(error);
            callback({error: error, result: null});
        }
        else {
            callback({error: null, result: body});
        }
    });
    console.log('Lock request has been sent');
}

function sessionUpdate(sessionId, level, message, details, callback) {
    sessions.getSessionByParams({'_id': sessionId}).then(function(session) {
        if (typeof session === 'undefined') {
            console.warn(
                'sessionUpdate attempted for a session that is not started.');
            console.warn('message: ' + message);
        } else {
            if (message === 'Android auto') {
                session.currentStep = 'Auto passed';
                session.device.passed_auto = details.passedAuto;
                sessions.updateSession(session);
            } else if (message === 'Android manual') {
                session.currentStep = 'Manual Testing';
                session.device.passed_manual = details.passedManual;
                session.device.passed_auto = details.passedAuto;
                sessions.updateSession(session);

            } else if (message === 'Android test fail') {
                session.currentStep = 'Session Failed';
                session.failedTests = details.failedTests;
                sessions.updateSession(session);

            } else {
                logSession(session, level, message, details);
            }
        }
        callback();
    }).catch(function(err) {
        console.log('Something went wrong while getting sessions of err' + err);
    });
}

function sessionUpdateItem(serial, device) {
    return new Promise(function(resolve, reject) {
        sessions.sessionUpdateItem(serial, device).then(function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
                //resendSessions();
            }
        }).catch(function(err) {
            console.log('Something went wrong while updating session item for serial:' +
                err);
        });
    });

}

function sessionFinish(sessionId, data, callback) {
    //var session = sessions.get(sessionId);
    sessions.getSessionByParams({'_id':sessionId}).then(function(session) {
        console.log('A client requested to finish an ' + session.device.type +
            ' refresh of session id ' + session._id);
        if (session.device.type === 'XboxOne') {
            if (isDevelopment) {
                logSession(session, 'Info', 'Checking ' + data.device.id +
                    ' for evidence that the refresh completed successfully.');
                logSession(session, 'Info',
                    'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
                console.log(
                    'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
                setTimeout(function() {
                    closeSession(session, true, callback);
                }, 3000);
            } else {
                logSession(session, 'Info', 'Checking ' + data.device.id +
                    ' for evidence that the refresh completed successfully.');
                var mountSource = '/dev/' + data.device.id + '1';
                var mountTarget = '/mnt/' + data.device.id + '1';
                fs.mkdir(mountTarget, function(err) {
                    if (err && err.code !== 'EEXIST') {
                        logSession(session, 'Error', 'Error creating directory ' +
                            mountTarget, err);
                    } else {
                        logSession(session, 'Info', 'Attempting to mount ' +
                            mountSource + ' to ' + mountTarget);
                        var mount = childProcess.spawn('mount',
                            [mountSource, mountTarget]);
                        mount.on('close', function(code) {
                            var systemUpdateDir = path.join(mountTarget,
                                '$SystemUpdate');
                            if (code !== 0) {
                                logSession(session,
                                    'Error', 'Error, failed to mount ' +
                                    mountSource + ' to ' +
                                    mountTarget, 'Mount command failed with error code ' +
                                    code);
                            } else {
                                logSession(session,
                                    'Info', 'Successfully mounted ' + mountSource +
                                    ' to ' + mountTarget);
                                var success = filesExist(systemUpdateDir, [
                                    'smcerr.log',
                                    'update.cfg',
                                    'update.log',
                                    'update2.cfg']);
                                rimraf(path.join(mountTarget, '*'), function(err) {
                                    childProcess.spawn('umount', [mountTarget]);
                                    closeSession(session, success, callback);
                                });
                            }
                        });
                    }
                });
            }
        } else {
            closeSession(session, data.complete, callback);
        }
    }).catch(function(err){
        console.log('Session with:' + sessionId + ' was not found in Tingo');
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
    console.log('Closing session');
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
    callback(success);
    sendSession(session);
}

function timeoutExpired(startTime) {
    var timeoutTime = startTime + config.deviceUnlockTimeout;
    console.log(startTime);
    console.log(timeoutTime);
    console.log(new Date());
    return timeoutTime > new Date();
}

function lockDeviceAndSendSession(content, file) {
    if (!content.state.deviceLocked &&
        !timeoutExpired(content.session.start_time)) {
        lockDevice(content.session.item_number, function(data) {
            if (data.error === null) {
                content.state.deviceLocked = true;
                fs.writeFile(file, JSON.stringify(content), function(err) {
                    sendSession(content, file);
                });
            } else {
                sendSession(content, file);
            }
        });
    } else {
        sendSession(content, file);
    }
}

function sendSession(session) {
    // deleting extra keys which added for client to continue session
    var sessionID = session._id;
    if (session.device.item_number ){
        delete session.device.number_of_auto;
        delete session.device.number_of_manual;
        delete session.device.adb_serial;
        delete session.device.passed_auto;
        delete session.device.passed_manual;
        delete session.currentStep;
        delete session.failed_tests;
        console.log('Sending session with this ID:' + sessionID + ' for device: ' + session.device.item_number);
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
            console.log('Session with this this ID:' + sessionID + ' was sent.' );
        }).catch(function(error) {
            console.log('ERROR: Unable to send session.');
            console.log(error);
        });
    } else {
        console.log('Session with this ID not sent:' + sessionID)
    }
}
function resendSessions() {
    console.log('Attempting to resend unsent sessions');
    sessions.getSessionsByParams(
        {'device.item_number': {$exists: true, $ne: null}, 'is_sent': false, 'status': { $in: ["Fail", "Success"] }}).
        then(function(sessions) {
            for (var i = 0; i < sessions.length; i++) {
                sendSession(sessions[i]);
            }
        }).
        catch(function(err) {
            console.log(err);
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
