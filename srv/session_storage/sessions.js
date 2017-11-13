/*jslint node: true */
'use strict';
module.exports = function(io) {
    var Db = require('tingodb')().Db,
        assert = require('assert'),
        winston = require('winston'),
        config = require('../config.js'),
        station = require('../station.js'),
        request = require('requestretry');
    var db = new Db(config.kioskDataPath, {});
    var sessions = db.collection('sessions');
    var Promise = require('bluebird');
    Promise.config({
        warnings: false
    });
    var API_URL = 'https://api2.basechord.com';
    var RESEND_SESSIONS_INTERVAL = 900000; // 15 minutes

    //Periodically resend unsent sessions
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
        winston.info('Adding session with id: ' + session._id);
        return new Promise(function(resolve, reject) {
            sessions.insert(session, function(err) {
                assert.equal(null, err);
                if (err) {
                    reject(err);
                } else {
                    winston.info('New session ID is ' + session._id);
                    resolve(session);
                }
            });
        });
    }

    function update(session) {
        winston.info('Updating session with id: ' + session._id);
        return new Promise(function(resolve, reject) {
            sessions.update({_id: session._id}, session,
                {upsert: true, setDefaultsOnInsert: true},
                function(err, updatedSession) {
                    if (err) {
                        winston.error('Can not update session' + session._id + 'in tingo because of' + err);
                        reject(err);
                    } else {
                        io.emit('session-updated', session);
                        resolve(session);
                    }
                });
        });
    }

    function updateCurrentStep(sessionId, currentStep) {
        winston.info('Updating current step of sesson ' + sessionId);
        return new Promise(function(resolve, reject) {
            sessions.update({_id: sessionId},
                {
                    $set: {
                        'tmp.currentStep': currentStep
                    }
                },
                function(err, updatedSession) {
                    if (err) {
                        winston.error('Can not update session' + sessionId + 'in tingo because of' + err);
                        reject(err);
                    } else {
                        sessions.findOne({_id: sessionId}, function(err, session) {
                            if (err) {
                                reject(err);
                            } else {
                                io.emit('session-updated', session);
                                resolve(session);
                            }
                        });
                    }
                });
        });
    }

    function updateItem(sessionId, item) {
        winston.info('Updating item of sesson ' + sessionId);
        return new Promise(function(resolve, reject) {
            sessions.update({_id: sessionId},
                {
                    $set: {
                        'device.item_number': item.item_number,
                        'device.sku': item.sku
                    }
                },
                function(err) {
                    if (err) {
                        winston.error('Can not update session' + sessionId + 'in tingo because of' + err);
                        reject(err);
                    } else {
                        sessions.findOne({_id: sessionId}, function(err, session) {
                            if (err) {
                                reject(err);
                            } else {
                                io.emit('session-updated', session);
                                resolve(session);
                            }
                        });
                    }
                });
        });
    }

    function start(sessionId, device, tmp) {
        winston.info('Session: ' + sessionId + ' started');
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
                    winston.info('Session with ID:' + sessionId +
                        ' was inserted succesfully');
                    io.emit('session-started', newSession);
                    resolve(newSession);
                }).catch(function(err) {
                    winston.log(
                        'error', 'Error while inserting session with ID:' +
                        sessionId + ' Error:' + err);
                    reject(err);
                });
            });
        });
    }

    function deviceBroken(device) {
        var startTime = new Date();
        var sessionId = startTime;
        winston.info('Session: ' + sessionId + ' device is broken');
        return new Promise(function(resolve, reject) {
            var stationName = station.getName();
            station.getServiceTag(function(stationServiceTag) {
                var newSession = {
                    'start_time': startTime,
                    'end_time': null,
                    'status': 'Fail',
                    'diagnose_only': false,
                    'device': device,
                    'station': {
                        'name': stationName,
                        'service_tag': stationServiceTag
                    },
                    'logs': [
                        {
                            'timestamp': startTime,
                            'level': 'Info',
                            'message': 'Device is broken',
                            'details': ''
                        }
                    ],
                    'tmp': {},
                    'is_sent': false,
                    '_id': sessionId
                };
                insert(newSession).then(function(session) {
                    winston.info('Session with ID:' + sessionId + ' was inserted succesfully');
                    io.emit('session-complete', newSession);
                    resolve(session);
                }).catch(function(err) {
                    winston.log(
                        'error', 'Error while inserting session with ID:' + sessionId + ' Error:' + err);
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
                        winston.error('Can not update logs for' + sessionId + 'in Tingo because of' + err);
                    }
                    resolve();
                }
            );
        });
    }

    function finish(sessionId, details) {
        return new Promise(function(resolve, reject) {
            getSessionByParams({_id: sessionId}).then(function(session) {
                winston.info('A client requested to finish an ' + session.device.type + ' refresh of session id ' +
                    session._id);
                session.end_time = new Date();
                if (details.diagnose_only) {
                    session.diagnose_only = true;
                }
                if (details.complete) {
                    addLogEntry(sessionId, 'Info', 'Refresh completed successfully.');
                    session.status = 'Success';
                    update(session);
                } else {
                    addLogEntry(sessionId, 'Info', 'Refresh failed.');
                    session.status = 'Fail';
                    update(session);
                }
                io.emit('session-complete', session);
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
            winston.info('Sending session with this ID:' + sessionID + ' for device: ' + session.device.item_number);
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
                winston.info('Session with this this ID:' + sessionID + ' was sent.');
            }).catch(function(error) {
                winston.error('ERROR: Unable to send session.');
                winston.log('error', error);
            });
        } else {
            winston.info('Session with this ID not sent:' + sessionID);
        }
    }

    function resend() {
        winston.info('Attempting to resend unsent sessions');
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

    return {
        'getSessionsByParams': getSessionsByParams,
        'getSessionByParams': getSessionByParams,
        'insert': insert,
        'update': update,
        'updateItem': updateItem,
        'updateCurrentStep': updateCurrentStep,
        'start': start,
        'deviceBroken': deviceBroken,
        'addLogEntry': addLogEntry,
        'finish': finish,
        'resend': resend
    };
};
