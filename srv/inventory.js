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

const UNSENT_SESSIONS_DIRECTORY = './unsentSessions';
const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost + '/api/inventorylookup/';
const API_URL = 'https://api2.basechord.com';
const RESEND_SESSIONS_INTERVAL = 900000; // 15 minutes

var isDevelopment = process.env.NODE_ENV === 'development';
var result = null;


exports.sessionStart = sessionStart;
exports.sessionUpdate = sessionUpdate;
exports.sessionFinish = sessionFinish;
exports.resendSessions = resendSessions;
exports.getItem = getItem;
exports.lockAndroid = lockAndroid;
exports.unlockAndroid = unlockAndroid;


// Periodically resend unsent sessions
resendSessions();
setInterval(function() {
    resendSessions();
}, RESEND_SESSIONS_INTERVAL);


function getItem(id, callback) {
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
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, item: body});
        }
    });
}

function lockAndroid(imei, callback) {
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
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, result: body});
        }
    });
    console.log('Lock request has been sent');
}

function unlockAndroid(imei, callback) {
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
            callback({error: error, result: null});
        }
        else {
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, result: body});
        }
    });
    console.log('Unlock request has been sent');
}

function sessionStart(device, callback) {
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
            "station": {
                "name": station_name,
                "service_tag": station_service_tag
            },
            "logs": []
        };

        sessions.set(session_device.item_number, newSession);
        callback();
    });
}

function sessionUpdate(itemNumber, message, details, callback) {
    var session = sessions.get(itemNumber);
    logSession(session, message, details);
    callback();
}

function sessionFinish(itemNumber, details, callback) {
    var session = sessions.get(itemNumber);

    console.log('A client requested to finish an ' + session.device.type + ' refresh of item number ' + itemNumber);
    if (session.device.type === 'XboxOne') {
        if (isDevelopment) {
            logSession(session, 'Checking ' + details.device.id + ' for evidence that the refresh completed successfully.');
            logSession(session, 'Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            console.log('Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                closeSession(session, true, callback);
            }, 3000);
        } else {
            logSession(session, 'Checking ' + details.device.id + ' for evidence that the refresh completed successfully.');
            var mountSource = '/dev/' + details.device.id + '1';
            var mountTarget = '/mnt/' + details.device.id + '1';
            fs.mkdir(mountTarget, function(err) {
                if (err && err.code !== 'EEXIST') {
                    logSession(session, 'Error creating directory ' + mountTarget, err);
                } else {
                    logSession(session, 'Attempting to mount ' + mountSource + ' to ' + mountTarget);
                    var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                    mount.on('close', function(code) {
                        var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                        if (code !== 0) {
                            logSession(session, 'Error, failed to mount ' + mountSource + ' to ' + mountTarget, 'Mount command failed with error code ' + code);
                        } else {
                            logSession(session, 'Successfully mounted ' + mountSource + ' to ' + mountTarget);
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
        closeSession(session, details.complete, callback);
    }
}

function logSession(session, message, details) {
    var logEntry = {
        "timestamp": new Date(),
        "level": "Info",
        "message": message,
        "details": details
    };

    session.logs.push(logEntry);
}

function closeSession(session, success, callback) {
    console.log("closing session");
    session.end_time = new Date();
    if (success) {
        logSession(session, 'Refresh completed successfully.');
        session.status = 'Success';
    } else {
        logSession(session, 'Refresh failed.');
        session.status = 'Fail';
    }
    console.log(session);
    sendSession(session, callback);
}

function saveSessionFile(session, filename) {
    fs.writeFile(filename, JSON.stringify(session), function(err) {
        if (err) {
            console.error('Unable to write the file ' + filename + '. Cannot save session for resend!', err);
            console.error(session);
        }
        sessions.delete(session.device.item_number);
    })
}

function saveSessionForResend(session) {
    var sessionFileName = UNSENT_SESSIONS_DIRECTORY + '/' + uuid() + '.json';
    fs.stat(UNSENT_SESSIONS_DIRECTORY, function(err, stats) {
        if (err) {
            if (err.code === "ENOENT") {
                fs.mkdir(UNSENT_SESSIONS_DIRECTORY, saveSessionFile(session, sessionFileName));
            } else {
                console.error('Unable to check the existence of ' + UNSENT_SESSIONS_DIRECTORY + '. Cannot save session for resend!', err);
                console.error(session);
            }
        } else {
            saveSessionFile(session, sessionFileName);
        }
    });
}

function resendSessions() {
    // Loop through all the files in the unsent sessions directory
    fs.readdir(UNSENT_SESSIONS_DIRECTORY, function(err, files) {
        if (err) {
            if (err.code !== "ENOENT") {
                console.error("Could not list the unsent sessions directory.", err);
            }
        } else {
            files.forEach(function(file) {
                file = UNSENT_SESSIONS_DIRECTORY + '/' + file;
                fs.readFile(file, function(err, data) {
                    if (err) {
                        console.error("Could not read " + file, err);
                    } else {
                        return request({
                            method: 'POST',
                            url: API_URL + '/session',
                            headers: {
                                'Authorization': config.api2Authorization
                            },
                            body: JSON.parse(data),
                            rejectUnauthorized: false,
                            json: true
                        }).then(function(body) {
                            // Delete the file if it was successfully sent
                            fs.unlinkSync(file);
                        }).catch(function(error) {
                            console.log('ERROR: Unable to resend session.');
                            console.log(error);
                        });
                    }
                });
            });
        }
    });
}

function sendSession(session, callback) {
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
        sessions.delete(session.device.item_number);
        callback({success: session.SessionState = 'Success', sent: true});
    }).catch(function(error) {
        console.log('ERROR: Unable to send session.');
        console.log(error);
        saveSessionForResend(session);
        callback({success: session.SessionState = 'Success', sent: false});
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
            }
        }
    }
    return session_device;
}
