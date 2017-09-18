/**
 * Created by larry on 3/3/2016.
 */

var config = require('./config');
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var childProcess = require('child_process');
var rimraf = require('rimraf');
var request = require("requestretry");
var uuid = require('uuid/v1');
var station = require('./station');
const sessions = require('./sessionCache');
const usbDrives = require('./usbonly/usbCache');
const UNSENT_SESSIONS_DIRECTORY = config.kioskDataPath + '/unsentSessions';
const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost + '/api/inventorylookup/';
const SERIAL_LOOKUP_URL = 'https://' + config.apiHost + '/api/seriallookup/';
const API_URL = 'https://api2.basechord.com';
//const API_URL2 = 'http://localhost:3000';
const RESEND_SESSIONS_INTERVAL = 900000; // 15 minutes
console.log(UNSENT_SESSIONS_DIRECTORY);
var isDevelopment = process.env.NODE_ENV === 'development';
var result = null;

exports.getSessions = getSessions;
exports.getSession = getSession;
exports.sessionStart = sessionStart;
exports.sessionUpdate = sessionUpdate;
exports.sessionFinish = sessionFinish;
exports.resendSessions = resendSessions;
exports.getItem = getItem;
exports.lockDevice = lockDevice;
exports.unlockForService = unlockForService;
exports.unlockDevice = unlockDevice;
exports.getSerialLookup = getSerialLookup;
exports.getAllSessions = getAllSessions;
exports.checkSessionInProgress = checkSessionInProgress;
exports.checkSessionByStartDate = checkSessionByStartDate;
exports.sessionUpdateItem = sessionUpdateItem;
exports.getAllSessionsByDevice = getAllSessionsByDevice;
exports.getSessionInProgressByDevice = getSessionInProgressByDevice;
exports.getAllUsbDrives = getAllUsbDrives;
exports.getLowestUsbProgress = getLowestUsbProgress;
// Periodically resend unsent sessions
resendSessions();

setInterval(function() {
    resendSessions();
}, RESEND_SESSIONS_INTERVAL);
// Reverse lookup to Azure in case if not found in our Mongo DB
function getItemFromAzure(id, callback){
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
            if (!JSON.parse(response.body).message){
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

function getSessions(filter) {
    return sessions.getFiltered(filter);
}
function getAllSessions(){
    return sessions.getAllSessions();
}
function getSession(itemNumber) {
    return sessions.get(itemNumber);
}

function getAllUsbDrives(){
    return usbDrives.getAllUsbDrives();
}
function getLowestUsbProgress(){
    return usbDrives.getLowestUsbProgress();
}
function sessionStart(itemNumber, device, callback) {
    console.log('Session:' + itemNumber + 'starts now' );
    var diagnose_only = false;
    var session_device = changeDeviceFormat(device);
    var station_name = station.getName();
    station.getServiceTag(function(station_service_tag) {
        var newSession = {
            "start_time": new Date(),
            "end_time": null,
            "status": 'Incomplete',
            "diagnose_only": diagnose_only,
            "device": session_device,
            // "android_data": {
            //     "current_step":"",
            //     "number_of_auto_tests":"",
            //     "number_of_manual_tests":""
            // },
            "station": {
                "name": station_name,
                "service_tag": station_service_tag
            },
            "logs": []
        };

        sessions.set(itemNumber, newSession);
        callback();
    });
}
function unlockForService(imei, callback) {
    console.log('Unlocking imei ' + imei + ' for service...');
    request({
        method: 'POST',
        url: API_URL + '/unlockapi/unlock',
        headers: {
            'Authorization': config.api2Authorization
        },
        body: {'IMEI': imei, 'unlocked_for_service': true},
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

function unlockDevice(itemNumber, callback) {
    var session = sessions.get(itemNumber);
    getItem(itemNumber, function(res) {
        var imei = res.item.Serial;
        console.log(imei);
        request({
            method: 'POST',
            url: API_URL + '/unlockapi/unlock',
            headers: {
                'Authorization': config.api2Authorization
            },
            body: {'IMEI': imei},
            rejectUnauthorized: false,
            json: true
        }, function(error, response, body) {
            if (error) {
                console.error(error);
                //logSession(session, 'Error', 'Unable to request device unlock.', JSON.stringify(data.error, null, 2));
                callback({error: error, result: null});
            }
            else {
               // logSession(session, 'Info', 'Device is unlocked by ' + body.service);
                callback({error: null, result: body});
            }
        });
        console.log('Unlock request has been sent');
    });
}
function lockDevice(itemNumber, callback) {
    var session = sessions.get(itemNumber);
    getItem(itemNumber, function(res) {
        var imei = res.item.Serial;
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
                // logSession(session, 'Error', 'Unable to request device lock.', JSON.stringify(error, null, 2));

                callback({error: error, result: null});
            }
            else {
                // logSession(session, 'Info', 'Device is locked by ' + body.service);
                callback({error: null, result: body});
            }
        });
        console.log('Lock request has been sent');
    });
}

function sessionUpdate(itemNumber, level, message, details, callback) {
    var session = sessions.get(itemNumber);
    if (typeof session === 'undefined') {
        console.warn('sessionUpdate attempted for a session that is not started.');
        console.warn('message: ' + message);
    } else {
        if (message === 'Android auto') {
            session.currentStep = 'Auto passed';
            session.device.passed_auto = details.passedAuto;
        } else if (message === 'Android manual') {
            session.currentStep = 'Manual Testing';
            session.device.passed_manual = details.passedManual;
        } else if (message === 'Android test fail') {
            session.currentStep = 'Session Failed';
            session.failedTests = details.failedTests;
        } else if (message === 'Android device is not found in Inventory') {
            session.status = 'Device Unrecognized';
            //session.failedTests = details.failedTests;
        } else {
            logSession(session, level, message, details);
        }
    }
    callback();
}

function sessionUpdateItem(sessionId, device, level, message, details, callback) {
    var session = sessions.get(sessionId);
    //var session_device = changeDeviceFormat(device);
    if (typeof session === 'undefined') {
        console.warn('sessionUpdate attempted for a session that is not started.');
        console.warn('message: ' + message);
    } else {
        if (session.status === 'Device Unrecognized') {
            session.status = 'Incomplete';
        }
        session.device.sku = device.Sku;
        session.device.item_number = device.InventoryNumber;
        session.device.model = device.Model;
        session.device.manufacturer = device.Manufacturer;
        session.device.serial_number = device.Serial;
        session.device.type = device.Type;
        logSession(session, level, message, details);
        if(session.device.passed_auto <= session.device.number_of_auto) {
            session.currentStep = 'Auto passed';
        }
        if(session.device.passed_manual <= session.device.number_of_manual) {
            session.currentStep = 'Manual Testing';
        }
    }
    callback();
}

function sessionFinish(itemNumber, data, callback) {
    var session = sessions.get(itemNumber);
    console.log('A client requested to finish an ' + session.device.type + ' refresh of item number ' + itemNumber);
    if (session.device.type === 'XboxOne') {
        if (isDevelopment) {
            logSession(session, 'Info', 'Checking ' + data.device.id + ' for evidence that the refresh completed successfully.');
            logSession(session, 'Info', 'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            console.log('Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                closeSession(session, true, callback);
            }, 3000);
        } else {
            logSession(session, 'Info', 'Checking ' + data.device.id + ' for evidence that the refresh completed successfully.');
            var mountSource = '/dev/' + data.device.id + '1';
            var mountTarget = '/mnt/' + data.device.id + '1';
            fs.mkdir(mountTarget, function(err) {
                if (err && err.code !== 'EEXIST') {
                    logSession(session, 'Error', 'Error creating directory ' + mountTarget, err);
                } else {
                    logSession(session, 'Info', 'Attempting to mount ' + mountSource + ' to ' + mountTarget);
                    var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                    mount.on('close', function(code) {
                        var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                        if (code !== 0) {
                            logSession(session, 'Error', 'Error, failed to mount ' + mountSource + ' to ' + mountTarget, 'Mount command failed with error code ' + code);
                        } else {
                            logSession(session, 'Info', 'Successfully mounted ' + mountSource + ' to ' + mountTarget);
                            var success = filesExist(systemUpdateDir, ['smcerr.log', 'update.cfg', 'update.log', 'update2.cfg']);
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
}

function logSession(session, level, message, details) {
    if (typeof details === 'undefined')
        details = '';

    var logEntry = {
        "timestamp": new Date(),
        "level": level,
        "message": message,
        "details": details
    };

    session.logs.push(logEntry);
}

function closeSession(session, success, callback) {
    console.log("closing session");
    session.end_time = new Date();
    if (success) {
        logSession(session, 'Info', 'Refresh completed successfully.');
        session.status = 'Success';
    } else {
        logSession(session, 'Info', 'Refresh failed.');
        session.status = 'Fail';
    }
    callback(success);

    fs.mkdir(UNSENT_SESSIONS_DIRECTORY, function(err) {
        if (err && err.code !== 'EEXIST') {
            console.error('Failed to create directory ' + UNSENT_SESSIONS_DIRECTORY, err);
        } else {
            var file = UNSENT_SESSIONS_DIRECTORY + '/' + uuid() + '.json';
            var content = {
                session: session,
                state: {
                    deviceLocked: false
                }
            };
            fs.writeFile(file, JSON.stringify(content), function(err) {
                if (err) {
                    console.error('Unable to write the file ' + file + '. Cannot save session for resend!', err);
                    console.error(session);
                }
                //sessions.delete(session.device.item_number);

                sendSession(content, file);
            });
        }
    });
}

function timeoutExpired(startTime) {
    var timeoutTime = startTime + config.deviceUnlockTimeout;
    console.log(startTime);
    console.log(timeoutTime);
    console.log(new Date());
    return timeoutTime > new Date();
}

function lockDeviceAndSendSession(content, file) {
    if (!content.state.deviceLocked && !timeoutExpired(content.session.start_time)) {
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

function sendSession(content, file) {
    // deleting extra keys which added for client to continue session
    delete content.session.device.number_of_auto;
    delete content.session.device.number_of_manual;
    delete content.session.device.adb_serial;
    delete content.session.device.passed_auto;
    delete content.session.device.passed_manual;
    delete content.session.currentStep;
    delete content.session.failed_tests;

    if (content.session.device.item_number ){
        console.log('sending session');
        return request({
            method: 'POST',
            url: API_URL + '/session',
            headers: {
                'Authorization': config.api2Authorization
            },
            body: content.session,
            rejectUnauthorized: false,
            json: true
        }).then(function(body) {
            console.log('session sent ' + content.session.start_time.toISOString());
            // Delete the file if it was successfully sent
            fs.unlinkSync(file);
        }).catch(function(error) {
            console.log('ERROR: Unable to send session.');
            console.log(error);
        });
    } else {
        console.log('session with this start time not sent:' + content.session.start_time)
    }
}


function resendSessions() {
    checkSessionByStartDate();
    // Loop through all the files in the unsent sessions directory
    fs.readdir(UNSENT_SESSIONS_DIRECTORY, function(err, files) {
        if (err) {
            if (err.code !== "ENOENT") {
                console.error("Could not list the unsent sessions directory.", err);
            }
        } else {
            files.forEach(function(file) {
                file = UNSENT_SESSIONS_DIRECTORY + '/' + file;
                fs.readFile(file, function(err, content) {
                    if (err) {
                        console.error("Could not read " + file, err);
                    } else {
                        var contentJson = JSON.parse(content);
                        // Checking if there is session in session cache and if it matches with session in file
                        if (checkSessionByStartDate(contentJson.session.start_time).has_session === true) {
                            // if matches get device from session cache and put it on place of device in file
                            console.log('Resend session found session with start time:' + contentJson.session.start_time);
                            var session = sessions.get(checkSessionByStartDate(contentJson.session.start_time).session_id);
                            contentJson.session.device = session.device;
                        }
                        sendSession(contentJson, file);
                    }
                });
            });
        }
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

function checkSessionInProgress(item) {
    return sessions.checkSessionInProgress(item);
}
function checkSessionByStartDate(item) {
    return sessions.checkSessionByStartDate(item);
}
function getSessionInProgressByDevice(item) {
    return sessions.getSessionInProgressByDevice(item);
}
function getAllSessionsByDevice(serial) {
    return sessions.getAllSessionsByDevice(serial);
}
