/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config');
    var adb = require('adbkit');
    var Promise = require('bluebird');
    Promise.config({
        warnings: false
    });
    var client = adb.createClient();
    var apk = __dirname + '/app-release.apk';
    var spawn = require('child_process').spawn;
    var station = require('../station.js');
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');
    var inventory = require('../inventory.js');
    var sessions = require('../session_storage/sessions.js')(io);
    var winston = require('winston');

    var devices = [];
    winston.info('Device bridge started');
    client.trackDevices().then(function(tracker) {
        tracker.on('add', function(device) {
            io.emit('android-add', {});
        });
        tracker.on('change', function(device) {
            winston.info('Device type:' + device.type + ' for device:' + device.id);
            if (device.type === 'device') {
                io.emit('installation-started', {});
                winston.info('Device ' + device.id + ' is ready to install app.');
                installApp(device.id);
            }
        });
        tracker.on('remove', function(device) {
            winston.info('Device %s was unplugged:' + device.id);
            var index = devices.indexOf(device.id);
            sessions.getSessionByParams(
                {'tmp.adbSerial': device.id, 'status': 'Incomplete'}).
                then(function(session) {
                    return finishSession(session._id, {complete: false});
                }).
                catch(function(e) {
                    winston.error('Something went wrong while disconnecting device' + device.id + 'Error:' + e);
                });
            if (index > -1) {
                devices.splice(index, 1);
                io.emit('android-remove', {});
            }

        });
    }).catch(function(e) {
        winston.error('Something went wrong while connecting device:', e.stack);
    });
    //check for expired sessions every 10 minutes
    setInterval(function() {
        checkSessionExpired();
    }, 600000);

    // 3600000 - hour 600000 - 10 mins
    function checkSessionExpired() {
        winston.info('Check for expired sessions');
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
                        winston.info('Session with key:' + sessionId + ' is expired');
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
            }).catch(function(e) {
            winston.error(e);
        });
    }

    function getSerialLookup(imei) {
        winston.info('Getting serial lookup for imei:' + imei);
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

    function finishSession(sessionId, details) {
        winston.info('Finishing session with ID: ' + sessionId);
        return sessions.finish(sessionId, details).then(function(session) {
            winston.info('Session is finished ' + session._id);
            sessions.updateCurrentStep(sessionId, 'finish' + session.status);
        });
    }

    function installApp(serial) {
        return client.uninstall(serial, 'com.basechord.aarons.androidrefresh').then(function() {
            winston.info('Uninstalled previous version of app successfully for device: ' + serial);
            return client.install(serial, apk).then(function() {
                winston.info('App is installed for device ' + serial);
                io.emit('app-installed', {device: serial});
                // clear logcat before start the app
                return clearLogcat(serial).then(function(serialNo) {checkDeviceProgress(serialNo);}).
                    catch(function(e) {
                        winston.error('Something went wrong while clearing logcat for device: ' + serial + ' Error:' +
                            e.stack);
                    });
            }).catch(function(e) {
                winston.error('Something went wrong while installing the app on device: ' + serial + ' Error:' +
                    e.stack);
            });
        }).catch(function(e) {
            winston.error('Something went wrong while uninstalling the app on device: ' + serial + ' Error:' + e.stack);
        });
    }

    function checkDeviceProgress(serial) {
        winston.info(devices.length + ' devices in process');
        if (devices.length === 0) {
            winston.info('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        } else if (devices.indexOf(serial) === -1) {
            winston.info('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        }
    }

    function startApp(serial) {
        winston.info('Starting refresh app for device:' + serial);
        return client.shell(serial,
            'am start -n com.basechord.aarons.androidrefresh/com.basechord.aarons.androidrefresh.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER').
            then(adb.util.readAll).
            then(function(output) {
                winston.info('[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).
            catch(function(e) {
                winston.error('Something went wrong while launching the app on device: ' + serial + ' Error:' +
                    e.stack);
            });
    }

    function clearLogcat(serial) {
        winston.info('Clearing logcat for device:' + serial);
        return new Promise(function(resolve, reject) {
            var aaronsClearLogcat = spawn('adb',
                ['-s', serial, 'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function(data) {
            });
            winston.info('Logcat cleared for device: ' + serial);
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
        winston.info('Reading logcat for device: ' + serial);
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
            winston.info('Parsing logcat data: ' + data);
            if (IsJsonString(data.substring(data.indexOf('{')))) {
                // check if app started indexOf !== -1 means 'includes'
                if (data.indexOf('AppStartedCommand') !== -1) {
                    appStartedDataJson = JSON.parse(data.substring(data.indexOf('{')));
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

                    sessions.start(sessionDate, unknownItem, tmp).
                        then(function(session) {
                            return getSerialLookup(imei).then(function(res) {
                                session.device = inventory.changeDeviceFormat(res.item);
                                return sessions.update(session);
                            }).catch(function(e) {
                                winston.error('Failed to get serial number because of: ' + e);
                            });
                        }).
                        catch(function(e) {
                            winston.error(e);
                        });
                }

                // check if wipe started indexOf !== -1 means 'includes'
                else if (data.indexOf('WipeStarted') !== -1) {
                    if (failedTests.length > 0) {
                        sessions.addLogEntry(sessionDate, 'Info', 'Android test fail', {'failedTests': failedTests}).
                            then(function() {
                                return finishSession(sessionDate, {complete: false});
                            });
                    } else {
                        sessions.addLogEntry(sessionDate, 'Info', 'Android refresh app has initiated a factory reset.').
                            then(function() {return finishSession(sessionDate, {complete: true});});
                    }
                }

                // tests progress indexOf === -1 means 'not includes'
                else if (data.indexOf('beginning') === -1) {
                    var testResultJson = JSON.parse(data.substring(data.indexOf('{')));
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
                        session.tmp.currentStep = isAutoTest &&
                        passedAutoTests < session.tmp.numberOfAuto ? 'autoTesting' : 'manualTesting';
                        sessions.update(session);
                    }).catch(function(ee) {
                        winston.error('Something went wrong while getting data for device ' + serial + ' Error:' + e);
                    });
                }
            }
        });
    }
};
