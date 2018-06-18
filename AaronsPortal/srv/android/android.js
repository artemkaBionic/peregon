/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config.js');
    var adb = require('adbkit');
    var Promise = require('bluebird');
    Promise.config({
        // Enable cancellation
        cancellation: true
    });
    var client = adb.createClient();
    var apk = __dirname + '/app-release.apk';
    var spawn = require('child_process').spawn;
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');
    var inventory = require('../controllers/inventoryController.js');
    var Session = require('../models/session.js')(io);
    var winston = require('winston');
    var finishedDevices = [];

    winston.info('Device bridge started');
    client.trackDevices().then(function(tracker) {
        tracker.on('add', function(device) {
            winston.info('Device add ' + JSON.stringify(device));
            winston.info('Android device ' + device.id + ' is connected.')
            //Find incomplete session with matching adbSerial first, then one with no adbSerial
            return Session.find({
                $and: [
                    {
                        'status': 'Incomplete',
                        'device.type': 'Android'
                    },
                    {
                        $or: [
                            {'tmp.adbSerial': device.id},
                            {'tmp.adbSerial': {$exists: false}}
                        ]
                    }
                ]
            }).sort({'tmp.adbSerial': -1}).limit(1).then(function(sessions) {
                if (sessions.length > 0) {
                    var session = sessions[0];
                    session.tmp.adbSerial = device.id;
                    session.tmp.currentStep = 'authorizeDebug';
                    return session.save();
                }
            });
        });
        tracker.on('change', function(device) {
            winston.info('Device change ' + JSON.stringify(device));
            if (device.type !== 'offline') {
                winston.info('Android device ' + device.id + ' is ready to install app.');
                return Session.findOne({'tmp.adbSerial': device.id, 'status': 'Incomplete'}).then(function(session) {
                    if (session !== null) {
                        session.tmp.currentStep = 'waitForAppStart';
                        return session.save();
                    }
                }).then(function() {
                    return installApp(device.id);
                });
            }
        });
        tracker.on('remove', function(device) {
            winston.info('Device remove ' + JSON.stringify(device));
            var index = finishedDevices.indexOf(device);
            if (index >= 0) {
                winston.info('Finished Android device ' + device.id + ' is disconnected.');
                finishedDevices.splice(index, 1);
                return Promise.resolve();
            } else {
                winston.info('Incomplete Android device ' + device.id + ' is disconnected.');
                return Session.findOne({'tmp.adbSerial': device.id, 'status': 'Incomplete'}).then(function(session) {
                    if (session !== null) {
                        session.log('info', 'Android device disconnected', '');
                        session.tmp.currentStep = 'disconnected';
                        return session.save();
                    }
                }).catch(function(err) {
                    winston.error('Unable to find session for disconnected device.', err);
                });
            }
        });
    }).catch(function(err) {
        winston.error('Something went wrong while connecting device', err);
    });
    //check for expired sessions every 10 minutes
    setInterval(function() {
        checkSessionExpired();
    }, 600000);

    // 3600000 - hour 600000 - 10 mins
    function checkSessionExpired() {
        winston.info('Check for expired sessions');
        Session.find({
            'device.item_number': {$exists: true, $ne: null},
            'device.type': 'Android',
            'status': 'Incomplete'
        }).cursor().eachAsync(function(session) {
            var sessionStartTime = new Date(session.start_time);
            var sessionExpiredTime = new Date(sessionStartTime.getTime() + 3600000);
            var currentTime = new Date();
            if (currentTime > sessionExpiredTime) {
                winston.info('Session ' + session._id + ' is expired');
                session.finish(false, false, 'Expired');
            }
        });
    }

    function installApp(serial) {

        return client.uninstall(serial, 'com.basechord.aarons.androidrefresh').then(function() {
            winston.info('Uninstalled previous version of app successfully for device ' + serial);
        }).catch(function(err) {
            winston.error('Something went wrong while uninstalling the app on device ' + serial, err);
        }).finally(function() {
            return client.install(serial, apk).then(function() {
                winston.info('App is installed for device ' + serial);
                return startApp(serial);
            }).catch(function(err) {
                winston.error('Something went wrong while installing the app on device ' + serial, err);
                Session.findOne({'tmp.adbSerial': serial, 'status': 'Incomplete'}).then(function(session) {
                    if (session !== null) {
                        session.tmp.currentStep = 'appInstallFailed';
                        session.save();
                    }
                });
            });
        });
    }

    function startApp(serial) {
        winston.info('Starting refresh app for device ' + serial);
        return clearLogcat(serial).then(function() {
            return client.shell(serial,
                'am start -n com.basechord.aarons.androidrefresh/com.basechord.aarons.androidrefresh.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER').then(adb.util.readAll).then(function(output) {
                winston.info('[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).catch(function(err) {
                winston.error('Something went wrong while launching the app on device ' + serial, err);
                Session.findOne({'tmp.adbSerial': serial, 'status': 'Incomplete'}).then(function(session) {
                    if (session !== null) {
                        session.tmp.currentStep = 'appInstallFailed';
                        session.save();
                    }
                });
            });
        });
    }

    function clearLogcat(serial) {
        winston.info('Clearing logcat for device ' + serial);
        return new Promise(function(resolve, reject) {
            spawn('adb', ['-s', serial, 'logcat', '-c']);
            winston.info('Logcat cleared for device ' + serial);
            resolve();
        });
    }

    function readLogcat(serial) {
        winston.info('Reading logcat for device ' + serial);
        var aaronsLogcat = spawn('adb', ['-s', serial, 'logcat', '-s', 'Aarons_Result']);
        var imei = null;
        return Session.findOne({'tmp.adbSerial': serial, 'status': 'Incomplete'}).then(function(session) {
            aaronsLogcat.stdout.on('data', function(data) {
                data = decoder.write(data).trim();
                winston.info('Parsing logcat data ' + data);
                var event = {};
                try {
                    event = JSON.parse(data.substring(data.indexOf('{')));
                } catch (err) {
                } //Ignore content that is not JSON
                if (event.commandName !== undefined) {
                    if (event.commandName === 'AppStartedCommand') {
                        if (session === null) {
                            imei = event.data.imei;
                            var device = {
                                'type': 'Android',
                                'serial_number': imei
                            };
                            var tmp = {
                                'adbSerial': serial,
                                'autoTestsTotal': event.data.auto,
                                'autoTestsComplete': 0,
                                'manualTestsTotal': event.data.manual,
                                'manualTestsComplete': 0
                            };
                            session = new Session();
                            return session.start(device, tmp)
                                .then(function() {
                                    inventory.getSerialLookup(imei).then(function(item) {
                                        if (item !== null) {
                                            session.device = item;
                                        }
                                        return session.save();
                                    }).catch(function(err) {
                                        winston.error('Failed to get serial number', err);
                                    });
                                }).catch(function(err) {
                                winston.error('Error while attempting to start Android session', err);
                            });
                        } else {
                            session.failed_tests = [];
                            session.tmp.autoTestsTotal = event.data.auto;
                            session.tmp.autoTestsComplete = 0;
                            session.tmp.manualTestsTotal = event.data.manual;
                            session.tmp.manualTestsComplete = 0;
                            return session.save();
                        }
                    } else if (event.commandName === 'WipeStarted') {
                        finishedDevices.push(serial);
                        if (session.failed_tests !== undefined && session.failed_tests.length > 0) {
                            session.log('Info', 'Android test fail', 'Failed tests: ' + session.failed_tests.join(', '));
                            return session.finish(false, false);
                        } else {
                            session.log('Info', 'Android refresh app has initiated a factory reset.');
                            return session.finish(true, false);
                        }
                    } else {
                        var isAutoTest = event.commandName.indexOf('AutoTestCommand') === 0;
                        if (isAutoTest) {
                            session.tmp.autoTestsComplete++;
                        } else {
                            session.tmp.manualTestsComplete++;
                        }
                        if (event.passed === false) {
                            session.failed_tests.push(event.commandName);
                        }
                        session.tmp.currentStep = isAutoTest && session.tmp.autoTestsComplete < session.tmp.autoTestsTotal ? 'autoTesting' : 'manualTesting';
                        return session.save()
                    }
                }
            });
        });
    }
};
