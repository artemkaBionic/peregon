/**
 * Created by larry on 3/3/2016.
 */
const request = require('request');
var config = require('./config');
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');

const MONGO_DB_URL = 'mongodb://localhost/AppChord?connectTimeoutMS=30000';
const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost + '/api/inventorylookup/';
const ANDROID_LOCK_URL ='https://api2.basechord.com';

var isDevelopment = process.env.NODE_ENV === 'development';
var sessionType = null;
var session = null;

function initSession(manufacturer, model, serialNumber, itemNumber, sku) {
    var session = {
        'SessionDate': new Date(),
        'LastUpdated': new Date(),
        'DiagnoseOnly': false,
        'Computer': {
            'SKU': sku,
            'ServiceTag': null,
            'ComputerName': null,
            'AppChordId': null,
            'SerialNumber': serialNumber,
            'ComputerManufacturer': manufacturer,
            'Address': null,
            'NetworkAdapters': [],
            'Model': model,
            'ItemNumber': itemNumber
        },
        'RefreshStation': {
            'SKU': null,
            'ServiceTag': null,
            'ComputerName': null,
            'UUID': null,
            'AppChordId': null,
            'MsdmProductKey': null,
            'SerialNumber': null,
            'ComputerManufacturer': null,
            'Address': '192.168.108.5',
            'AssetTag': null,
            'NetworkAdapters': [  {
                'MacAddress': '',
                'IpAddress': '192.168.108.5' } ],
            'Model': null,
            'MsdmOemId': null },
        'Closed': null,
        'SessionState': 'Started',
        'AuditLogEntries': [],
        'CurrentState': 'Started' };

    updateSessionDb(session);
    return session;
}

function updateSessionDb(session) {
    if (!isDevelopment) {
        mongoClient.connect(MONGO_DB_URL, function (err, db) {
            assert.equal(err, null);
            if (session._id === undefined) {
                db.collection('RefreshSessions').insertOne(session, function (err, result) {
                    assert.equal(err, null);
                    console.log('Inserted refresh session:');
                    console.log(session);
                    db.close();
                });
            } else {
                db.collection('RefreshSessions').replaceOne({"_id": session._id}, session, function (err, result) {
                    assert.equal(err, null);
                    console.log('Updated refresh session:');
                    console.log(session);
                    db.close();
                });
            }
        });
    }
}

function logSession(session, processState, message) {
    logDate = new Date();

    logEntry = {};
    logEntry.Importance = "Info";
    logEntry.TimeStamp = logDate;
    logEntry.LogTimeStamp = logDate;
    logEntry.Details = null;
    logEntry.ProcessState = processState;
    logEntry.Message = message;

    session.LastUpdated = new Date();
    session.AuditLogEntries.push(logEntry);

    updateSessionDb(session);
}

function closeSession(session) {
    session.Closed = new Date();
    updateSessionDb(session);
    session = null;
    sessionType = null;
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

exports.getItem = function(id, callback) {
    request({
        url: INVENTORY_LOOKUP_URL + id,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
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
};

exports.lockAndroid = function(imei, callback) {
    request({
        method: 'POST',
        url: ANDROID_LOCK_URL + '/unlockapi/lock',
        headers: {
            'Authorization': config.androidApiAuthorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
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
};

exports.unlockAndroid = function(imei, callback) {
    request({
        method: 'POST',
        url: ANDROID_LOCK_URL + '/unlockapi/unlock',
        headers: {
            'Authorization': config.androidApiAuthorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
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
};

exports.sessionStart = function(type, item, callback) {
    sessionType = type;
    session = initSession(item.Manufacturer, item.Model, item.Serial, item.InventoryNumber, item.Sku);
    callback();
};

exports.sessionUpdate = function(message, callback) {
    logSession(session, "Started", message);
    callback();
};

exports.sessionFinish = function (details, callback) {
    console.log('A client requested to finish an ' + sessionType + ' refresh of item number ' + session.Computer.ItemNumber);
    if (sessionType === 'xbox-one') {
        if (isDevelopment) {
            console.log('Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                callback({success: true, device: details.device});
            }, 3000);
        } else {
            logSession(session, "Started", 'Checking ' + details.device.id + ' for evidence that the refresh completed successfully.');
            var mountSource = '/dev/' + details.device.id + '1';
            var mountTarget = '/mnt/' + details.device.id + '1';
            fs.mkdir(mountTarget, function(err) {
                if (err && err.code !== 'EEXIST') {
                    logSession(session, "Started", 'Error creating directory ' + mountTarget);
                    logSession(session, "Started", err);
                } else {
                    logSession(session, "Started", 'Attempting to mount ' + mountSource + ' to ' + mountTarget);
                    var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                    mount.on('close', function (code) {
                        var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                        if (code !== 0) {
                            logSession(session, "Started", 'Error, failed to mount ' + mountSource + ' to ' + mountTarget);
                            logSession(session, "Started", 'mount command failed with error code ' + code);
                        } else {
                            logSession(session, "Started", 'Successfully mounted ' + mountSource + ' to ' + mountTarget);
                            var success = filesExist(systemUpdateDir, ['smcerr.log', 'update.cfg', 'update.log', 'update2.cfg']);
                            rimraf(path.join(mountTarget, '*'), function(err) {
                                childProcess.spawn('umount', [mountTarget]);
                                if (success) {
                                    logSession(session, "Completed", 'Refresh completed successfully.');
                                    session.SessionState = session.CurrentState = 'Completed';
                                    closeSession(session);
                                    callback({success: true});
                                } else {
                                    logSession(session, "VerifyRefreshFailed", 'Refresh failed.');
                                    session.CurrentState = 'VerifyRefreshFailed';
                                    session.SessionState = 'Aborted';
                                    closeSession(session);
                                    callback({success: false});
                                }
                            });
                        }
                    });
                }
            });
        }
    } else {
        if (details.complete) {
            logSession(session, "Completed", 'Refresh completed successfully.');
            session.SessionState = session.CurrentState = 'Completed';
            closeSession(session);
            callback({success: true});
        } else {
            logSession(session, "VerifyRefreshFailed", 'Refresh failed.');
            session.CurrentState = 'VerifyRefreshFailed';
            session.SessionState = 'Aborted';
            closeSession(session);
            callback({success: false});
        }
    }
};
