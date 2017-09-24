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
exports.deviceBridge = deviceBridge;

function deviceBridge(io) {
    var devices = [];
    console.log('Device bridge started');

    client.trackDevices().then(function(tracker) {
        tracker.on('add', function(device) {
            console.log('Device %s was plugged in', device.id);
            io.emit('android-add', {});
        });
        tracker.on('change', function(device) {
            console.log('Device type:' + device.type + ' for device:' +
                device.id);
            if (device.type === 'device') {
                console.log('Device ' + device.id +
                    ' is ready to install app.');
                installApp(device.id);
            }
        });
        tracker.on('remove', function(device) {
            console.log('Device %s was unplugged', device.id);
            var index = devices.indexOf(device.id);
            sessions.getSessionByParams(
                {'tmp.adbSerial': device.id, 'status': 'Incomplete'}).
                then(function(session) {
                    finishSession(session._id, {'complete': false});
                }).
                catch(function(err) {
                    console.log('Something went wrong while disconnecting device' +
                        device.id + 'Error:' + err);
                });
            if (index > -1) {
                devices.splice(index, 1);
                io.emit('android-remove', {});
            }

        });
    }).catch(function(err) {
        console.error('Something went wrong while connecting device:',
            err.stack);
    });
    //check for expired sessions every 10 minutes
    setInterval(function() {
        checkSessionExpired();
    }, 600000);

    // 3600000 - hour 600000 - 10 mins
    function checkSessionExpired() {
        console.log('check for expired sessions');
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
                        console.log('Session with key:' + sessionId +
                            ' is expired');
                        io.emit('android-session-expired', {
                            'sessionId': sessions[i],
                            'device': sessions[i].device.serial_number
                        });
                        setTimeout(function() {
                            finishSession(sessionId, {'complete': false});
                            io.emit('session-expired-confirmation', {});
                        }, 5000);
                    }
                }
            }).catch(function(err) {
            console.log(err);
        });
    }

    function getSerialLookup(imei) {
        console.log('Getting serial lookup for imei:' + imei);
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
        console.log('Starting session ' + sessionId);
        return new Promise(function(resolve) {
            inventory.sessionStart(sessionId, item, tmp, function(session) {
                resolve(session);
            });
        });
    }

    function updateSession(sessionId, level, message, details) {
        console.log('Updating session ' + sessionId);
        return new Promise(function(resolve) {
            inventory.sessionUpdate(sessionId, level, message, details,
                function(session) {
                    resolve(session);
                });
        });

    }

    function finishSession(sessionId, details) {
        console.log('Finishing session with ID:' + sessionId);
        inventory.sessionFinish(sessionId, details, function(session) {
            console.log('Session is finished ' + session._id);
            session.tmp.currentStep = 'finish' + session.status;
            io.emit('android-reset', session);
        });
    }

    function installApp(serial) {
        client.uninstall(serial,
            'com.basechord.aarons.androidrefresh.basechord').then(function() {
            console.log('Uninstalled previous version of app successfully for device: ' +
                serial);
            client.install(serial, apk).then(function() {
                console.log('App is installed for device ' + serial);
                io.emit('app-installed', {device: serial});
                // clear logcat before start the app
                clearLogcat(serial).then(function(serialNo) {
                    checkDeviceProgress(serialNo);
                }).catch(function(err) {
                    console.error('Something went wrong while clearing logcat for device: ' +
                        serial + ' Error:' + err.stack);
                });
            }).catch(function(err) {
                console.error('Something went wrong while installing the app on device: ' +
                    serial + ' Error:' + err.stack);
            });
        }).catch(function(err) {
            console.error('Something went wrong while uninstalling the app on device: ' +
                serial + ' Error:' + err.stack);
        });

    }

    function checkDeviceProgress(serial) {
        console.log(devices.length + ' devices in process');
        if (devices.length === 0) {
            console.log('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        } else if (devices.indexOf(serial) === -1) {
            console.log('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        }
    }

    function startApp(serial) {
        console.log('Starting refresh app for device:' + serial);
        return client.shell(serial,
            'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER').
            then(adb.util.readAll).
            then(function(output) {
                console.log('[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).
            catch(function(err) {
                console.error('Something went wrong while launching the app on device: ' +
                    serial + ' Error:' + err.stack);
            });
    }

    function clearLogcat(serial) {
        console.log('Clearing logcat for device:' + serial);
        return new Promise(function(resolve, reject) {
            var aaronsClearLogcat = spawn('adb',
                ['-s', serial, 'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function(data) {
                console.log(data);
            });
            console.log('Logcat cleared for device: ' + serial);
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
        console.log('Reading logcat for device: ' + serial);
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
            console.log('parsing logcat data: ' + data);
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
                    getSerialLookup(imei).then(function(res) {
                        startSession(sessionDate, res.item, tmp).
                            then(function(session) {
                                session.tmp.currentStep = 'autoTesting';
                                io.emit('app-start', session);
                            }).
                            catch(function(err) {
                                console.error(err);
                            });
                    }).catch(function(err) {
                        console.log('Failed to get serial number because of: ' +
                            err);
                        var unknownItem = {
                            Type: 'Android',
                            adbSerial: serial,
                            serial_number: imei
                        };
                        startSession(sessionDate, unknownItem, tmp).
                            then(function(session) {
                                io.emit('app-start', session);
                                updateSession(sessionDate, 'Info',
                                    'Android device is not found in Inventory');
                            }).
                            catch(function(err) {
                                console.error(err);
                            });
                    });
                }

                // check if wipe started indexOf !== -1 means 'includes'
                else if (data.indexOf('WipeStarted') !== -1) {
                    if (failedTests.length > 0) {
                        updateSession(sessionDate, 'Info', 'Android test fail',
                            {'failedTests': failedTests});
                        finishSession(sessionDate, {'complete': false});

                    } else {
                        updateSession(sessionDate, 'Info',
                            'Android refresh app has initiated a factory reset.');
                        finishSession(sessionDate, {'complete': true});
                    }
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
                        console.log('Something went wrong while getting data for device ' +
                            serial + 'Error:' + err);
                    });
                }

            }
        });
    }
}
