/*jslint node: true */
'use strict';
var Db = require('tingodb')().Db,
    assert = require('assert'),
    winston = require('winston'),
    config = require('../config'),
    station = require('../station.js'),
    request = require('requestretry');
var db = new Db('.', {});
var sessions = db.collection('sessions');
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var API_URL = 'https://api2.basechord.com';
var RESEND_SESSIONS_INTERVAL = 900000; // 15 minutes

exports.getSessionsByParams = getSessionsByParams;
exports.getSessionByParams = getSessionByParams;
exports.updateItem = updateItem;
exports.start = start;
exports.addLogEntry = addLogEntry;
exports.finish = finish;

//Periodically resend unsent sessions
resend();
setInterval(function() {
    resend();
}, RESEND_SESSIONS_INTERVAL);

function getSessionsByParams(params) {
    return new Promise(function(resolve, reject) {
        sessions.find(params).toArray(function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function getSessionByParams(params) {
    return new Promise(function(resolve, reject) {
        sessions.findOne(params, function(err, session) {
            if (err) {
                reject(err);
            } else {
                resolve(session);
            }
        });
    });
}

function insert(session) {
    winston.log('info', 'Adding session with id: ' + session._id);
    return new Promise(function(resolve, reject) {
        sessions.insert(session, function(err, result) {
            assert.equal(null, err);
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function update(session) {
    winston.log('info', 'Updating session with id: ' + session._id);
    return new Promise(function(resolve, reject) {
        sessions.update({_id: session._id}, session,
            {upsert: true, setDefaultsOnInsert: true},
            function(err) {
                if (err) {
                    winston.log('error', 'Can not update session' +
                        session._id +
                        'in tingo because of' + err);
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

function updateItem(params, item) {
    winston.log('info', 'Updating all sessons in Tingo with params:' + params);
    return new Promise(function(resolve, reject) {
        sessions.update(params,
            {
                $set: {
                    'device.sku': item.Sku,
                    'device.item_number': item.InventoryNumber,
                    'device.model': item.Model,
                    'device.manufacturer': item.Manufacturer,
                    'device.type': item.Type,
                    'device.serial_number': item.Serial
                }
            }, {upsert: true, setDefaultsOnInsert: true, multi: true},
            function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });

    });
}

function start(sessionId, device, tmp) {
    winston.log('info', 'Session: ' + sessionId + ' started');
    return new Promise(function(resolve, reject) {
        var stationName = station.getName();
        station.getServiceTag(function(stationServiceTag) {
            var newSession = {
                'start_time': new Date(),
                'end_time': null,
                'status': 'Incomplete',
                'diagnose_only': false,
                'device': device,
                'station': {
                    'name': stationName,
                    'service_tag': stationServiceTag
                },
                'logs': [],
                'tmp': tmp,
                'is_sent': false,
                '_id': sessionId
            };
            insert(newSession).then(function(session) {
                winston.log('info', 'Session with ID:' + sessionId +
                    ' was inserted succesfully');
                resolve(newSession);
            }).catch(function(err) {
                winston.log('error', 'Error while inserting session with ID:' +
                    sessionId + ' Error:' + err);
                reject(err);
            });
        });
    });
}

function addLogEntry(sessionId, level, message, details) {
    if (typeof details === 'undefined') {
        details = '';
    }
    var logEntry = {
        'timestamp': new Date(),
        'level': level,
        'message': message,
        'details': details
    };

    return new Promise(function(resolve) {
        sessions.update(
            {_id: sessionId},
            {$push: {logs: logEntry}}, function(err) {
                if (err) {
                    winston.log('error', 'Can not update logs for' + sessionId +
                        'in Tingo because of' + err);
                }
                resolve();
            }
        );
    });
}

function finish(sessionId, details) {
    return new Promise(function(resolve, reject) {
        getSessionByParams({_id: sessionId}).then(function(session) {
            winston.log('info', 'A client requested to finish an ' +
                session.device.type + ' refresh of session id ' + session._id);
            session.end_time = new Date();
            if (details.diagnose_only) {
                session.diagnose_only = true;
            }
            if (details.complete) {
                addLogEntry(sessionId, 'Info',
                    'Refresh completed successfully.');
                session.status = 'Success';
                update(session);
            } else {
                addLogEntry(sessionId, 'Info', 'Refresh failed.');
                session.status = 'Fail';
                update(session);
            }
            resolve(session);
            send(session);
        }).catch(function(err) {
            winston.log('error', err);
            reject(err);
        });
    });
}

function send(session) {
    // deleting extra keys which added for client to continue session
    var sessionID = session._id;
    if (session.device.item_number) {
        delete session.tmp;
        winston.log('info', 'Sending session with this ID:' + sessionID +
            ' for device: ' + session.device.item_number);
        request({
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
            update(session);
            winston.log('info', 'Session with this this ID:' + sessionID +
                ' was sent.');
        }).catch(function(error) {
            winston.log('error', 'ERROR: Unable to send session.');
            winston.log('error', error);
        });
    } else {
        winston.log('info', 'Session with this ID not sent:' + sessionID);
    }
}

function resend() {
    winston.log('info', 'Attempting to resend unsent sessions');
    getSessionsByParams(
        {
            'device.item_number': {$exists: true, $ne: null},
            'is_sent': false,
            'status': {$in: ['Fail', 'Success']}
        }).
        then(function(sessions) {
            for (var i = 0; i < sessions.length; i++) {
                send(sessions[i]);
            }
        }).
        catch(function(err) {
            winston.log('error', err);
        });
}
