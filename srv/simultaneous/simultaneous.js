'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
var client = adb.createClient();
var apk = __dirname + '/app-release.apk';
var spawn = require('child_process').spawn;
var station = require('../station');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var inventory = require('../inventory');
var sessions = require('../session_storage/sessions');
var winston = require('winston');
exports.deviceBridge = deviceBridge;

function deviceBridge(io) {
    var devices = [];
    winston.log('info', 'Device bridge started');
    client.trackDevices().then(function(tracker) {
        tracker.on('add', function(device) {
            io.emit('android-add', {});
        });
        tracker.on('change', function(device) {
            winston.log('info', 'Device type:' + device.type + ' for device:' + device.id);
            if (device.type === 'device') {
                io.emit('installation-started', {});
                winston.log('info', 'Device ' + device.id + ' is ready to install app.');
                installApp(device.id);
            }
        });
        tracker.on('remove', function(device) {
            winston.log('info', 'Device %s was unplugged:' + device.id);
            var index = devices.indexOf(device.id);
            sessions.getSessionByParams(
                {'tmp.adbSerial': device.id, 'status': 'Incomplete'}).
                then(function(session) {
                    finishSession(session._id, {complete: false});
                }).
                catch(function(err) {
                    winston.log('error', 'Something went wrong while disconnecting device' + device.id + 'Error:' + err);
                });
            if (index > -1) {
                devices.splice(index, 1);
                io.emit('android-remove', {});
            }

        });
    }).catch(function(err) {
        winston.log('error', 'Something went wrong while connecting device:', err.stack);
    });
    //check for expired sessions every 10 minutes
    setInterval(function() {
        checkSessionExpired();
    }, 600000);

    // 3600000 - hour 600000 - 10 mins
    function checkSessionExpired() {
        winston.log('info', 'Check for expired sessions');
        sessions.getSessionsByParams(
            {
                'device.item_number': {$exists: true, $ne: null},
                'status': 'Incomplete'
            }).
            then(function(sessions) {
                for (var i = 0; i < sessions.length; i++) {
                    var sessionId = sessions[i]._id;
                    var sessionDate = new Date(sessions[i].start_time);
                    var plusOneHour = sessionDate.getTime() + (3600000);
                    var expireDate = new Date(plusOneHour);
                    var currentDate = new Date();
                    if (currentDate > expireDate) {
                        winston.log('info', 'Session with key:' + sessionId + ' is expired');
                        io.emit('android-session-expired', {
                            'sessionId': sessions[i],
                            'device': sessions[i].device.serial_number
                        });
                        setTimeout(function() {
                            finishSession(sessionId, {complete: false});
                            io.emit('session-expired-confirmation', {});
                        }, 5000);
                    }
                }
            }).catch(function(err) {
                winston.log('error', err);
        });
    }

    function getSerialLookup(imei) {
        winston.log('info', 'Getting serial lookup for imei:' + imei);
        return new Promise(function(resolve, reject) {
            inventory.getSerialLookup(imei, function(item) {
                if (JSON.stringify(item).
                        toLowerCase().
                        indexOf('did not find device') === -1) {
                    resolve(item);
                } else {
                    reject('Device not found');
                }
            });
        });
    }

    function startSession(sessionId, item, tmp) {
        winston.log('info', 'Starting session ' + sessionId);
        return new Promise(function(resolve) {
            inventory.sessionStart(sessionId, item, tmp, function(session) {
                resolve(session);
            });
        });
    }

    function updateSession(session, level, message, details) {
        winston.log('info', 'Updating session ' + session._id);
        return new Promise(function(resolve) {
            inventory.sessionUpdate(session, level, message, details,
                function(session) {
                    resolve(session);
                });
        });

    }

    function finishSession(sessionId, details) {
        winston.log('info', 'Finishing session with ID: ' + sessionId);
        inventory.sessionFinish(sessionId, details, function(session) {
            winston.log('info', 'Session is finished ' + session._id);
            session.tmp.currentStep = 'finish' + session.status;
            io.emit('android-reset', session);
        });
    }

    function installApp(serial) {
        client.uninstall(serial,
            'com.basechord.aarons.androidrefresh').then(function() {
            winston.log('info', 'Uninstalled previous version of app successfully for device: ' + serial);
            client.install(serial, apk).then(function() {
                winston.log('info', 'App is installed for device ' + serial);
                io.emit('app-installed', {device: serial});
                // clear logcat before start the app
                clearLogcat(serial).then(function(serialNo) {
                    checkDeviceProgress(serialNo);
                }).catch(function(err) {
                    winston.log('error', 'Something went wrong while clearing logcat for device: ' +
                        serial + ' Error:' + err.stack);
                });
            }).catch(function(err) {
                winston.log('error', 'Something went wrong while installing the app on device: ' +
                    serial + ' Error:' + err.stack);
            });
        }).catch(function(err) {
            winston.log('error', 'Something went wrong while uninstalling the app on device: ' +
            serial + ' Error:' + err.stack);
        });

    }

    function checkDeviceProgress(serial) {
        winston.log('info', devices.length + ' devices in process');
        if (devices.length === 0) {
            winston.log('info', 'Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        } else if (devices.indexOf(serial) === -1) {
            winston.log('info', 'Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        }
    }

    function startApp(serial) {
        winston.log('info', 'Starting refresh app for device:' + serial);
        return client.shell(serial,
            'am start -n com.basechord.aarons.androidrefresh/com.basechord.aarons.androidrefresh.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER').
            then(adb.util.readAll).
            then(function(output) {
                winston.log('info', '[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).
            catch(function(err) {
                winston.log('error', 'Something went wrong while launching the app on device: ' +
                    serial + ' Error:' + err.stack);
            });
    }

    function clearLogcat(serial) {
        winston.log('info', 'Clearing logcat for device:' + serial);
        return new Promise(function(resolve, reject) {
            var aaronsClearLogcat = spawn('adb',
                ['-s', serial, 'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function(data) {
            });
            winston.log('info', 'Logcat cleared for device: ' + serial);
            resolve(serial);
        });
    }

    function IsJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    function readLogcat(serial) {
        winston.log('info', 'Reading logcat for device: ' + serial);
        var aaronsLogcat = spawn('adb',
            ['-s', serial, 'logcat', '-s', 'Aarons_Result']);
        var failedTests = [];
        var passedAutoTests = 0;
        var passedManualTests = 0;
        var imei = null;
        var appStartedDataJson = {};
        var sessionDate = new Date().toISOString();
        aaronsLogcat.stdout.on('data', function(data) {
            data = decoder.write(data);
            winston.log('info', 'Parsing logcat data: ' + data);
            if (IsJsonString(data.substring(data.indexOf('{')))) {
                // check if app started indexOf !== -1 means 'includes'
                if (data.indexOf('AppStartedCommand') !== -1) {
                    appStartedDataJson = JSON.parse(
                        data.substring(data.indexOf('{')));
                    imei = appStartedDataJson.data.imei;
                    appStartedDataJson.sessionId = sessionDate;
                    var tmp = {};
                    tmp.numberOfAuto = appStartedDataJson.data.auto;
                    tmp.numberOfManual = appStartedDataJson.data.manual;
                    tmp.adbSerial = serial;
                    var unknownItem = {
                        type: 'Android',
                        adbSerial: serial,
                        serial_number: imei
                    };

                    startSession(sessionDate, unknownItem, tmp).then(function(session) {
                        getSerialLookup(imei).then(function(res) {
                            session.device = inventory.changeDeviceFormat(res.item);
                            sessions.updateSession(session);
                            io.emit('app-start', session);
                        }).catch(function(err) {
                            winston.log('error', 'Failed to get serial number because of: ' + err);
                            io.emit('app-start', session);
                        });
                    }).catch(function(err) {
                        winston.log('error', err);
                    });
                }

                // check if wipe started indexOf !== -1 means 'includes'
                else if (data.indexOf('WipeStarted') !== -1) {
                    sessions.getSessionByParams(
                        {'_id': sessionDate}).then(function(session) {
                        if (failedTests.length > 0) {
                            updateSession(session, 'Info', 'Android test fail',
                                {'failedTests': failedTests}).then(function(){
                                finishSession(session._id, {complete: false});
                            });
                        } else {
                            updateSession(session, 'Info', 'Android refresh app has initiated a factory reset.').then(function(){
                                finishSession(session._id, {complete: true});
                            });
                        }
                    });
                }

                // tests progress indexOf === -1 means 'not includes'
                else if (data.indexOf('beginning') === -1) {
                    var testResultJson = JSON.parse(
                        data.substring(data.indexOf('{')));
                    var isAutoTest = testResultJson.commandName.indexOf(
                        'AutoTestCommand') !== -1;
                    if (testResultJson.passed === true) {
                        if (isAutoTest) {
                            passedAutoTests++;
                        } else {
                            passedManualTests++;
                        }
                    } else {
                        failedTests.push(testResultJson.commandName);
                    }
                    sessions.getSessionByParams(
                        {'_id': sessionDate}).then(function(session) {
                        session.tmp.passedAuto = passedAutoTests;
                        session.tmp.passedManual = passedManualTests;
                        session.failedTests = failedTests;
                        session.tmp.currentStep = isAutoTest && passedAutoTests < session.tmp.numberOfAuto ? 'autoTesting' : 'manualTesting';
                        sessions.updateSession(session);
                        io.emit('android-test', session);
                    }).catch(function(err) {
                        winston.log('error', 'Something went wrong while getting data for device ' + serial + ' Error:' + err);
                    });
                }
            }
        });
    }
}

