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
var sessions = require('../sessionCache');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var inventory = require('../inventory');
var sessions2 = require('../session_storage/sessions');
exports.deviceBridge = deviceBridge;

function deviceBridge(io) {
    var devices = [];
    console.log('Device bridge started');

    client.trackDevices()
        .then(function(tracker) {
            tracker.on('add', function(device) {
                console.log('Device %s was plugged in', device.id);
                io.emit('android-add', {});
            });
            tracker.on('change', function(device) {
                console.log('Device type:' + device.type + ' for device:' + device.id);
                if (device.type === 'device') {
                    console.log('Device ' + device.id + ' is ready to install app.');
                    installApp(device.id);
                }
            });
            tracker.on('remove', function(device) {
                console.log('Device %s was unplugged', device.id);
                var index = devices.indexOf(device.id);
                sessions2.getSessionsByParams({'device.adb_serial': device.id, 'status': 'Incomplete'}).then(function(sessions) {
                    for (var i = 0; i < sessions.length; i++) {
                        console.log(sessions[i]);
                        finishSession(sessions[i], {'complete': false});
                    }
                }).catch(function(err) {
                    console.log('Something went wrong while disconnecting device' + device.id + 'Error:' + err);
                });
                if (index > -1) {
                    devices.splice(index, 1);
                    io.emit('android-remove', {});
                }
            });
        })
        .catch(function(err) {
            console.error('Something went wrong while connecting device:', err.stack)
        });
    // check for expired sessions every 10 minutes
    // setInterval(function() {
    //     checkSessionExpired();
    // }, 600000);
    // // 3600000 - hour 600000 - 10 mins
    // function checkSessionExpired() {
    //     console.log('check for expired sessions');
    //     var sessions = inventory.getAllSessions();
    //     for (var key in sessions) {
    //         if (sessions.hasOwnProperty(key)) {
    //             if(sessions[key].status === 'Incomplete') {
    //                 var sessionDate = new Date(sessions[key].start_time);
    //                 var plusOneHour = sessionDate.getTime() + (3600000);
    //                 var expireDate = new Date(plusOneHour);
    //                 var currentDate = new Date();
    //                 if (currentDate > expireDate) {
    //                     console.log('Session with key:' + key + ' is expired');
    //                     io.emit('android-session-expired', {'sessionId': key, 'device': sessions[key].device.serial_number});
    //                     setTimeout(function(){
    //                         finishSession(key, {'complete': false});
    //                         io.emit('session-expired-confirmation', {});
    //                     },5000);
    //                 } else {
    //                     console.log('No expired sessions.');
    //                 }
    //             }
    //         }
    //     }
    // }
    function getSerialLookup(imei){
        console.log('Getting serial lookup for imei:' + imei);
        return new Promise(function(resolve, reject) {
            inventory.getSerialLookup(imei, function(item) {
                if (JSON.stringify(item).toLowerCase().indexOf('did not find device') === -1) {
                    resolve(item);
                } else {
                    reject('Device not found');
                }
            });
        })
    }

    function startSession(sessionId, item) {
        console.log('Starting session ' + sessionId);
        return new Promise(function(resolve) {
            inventory.sessionStart(sessionId, item, function() {
                resolve(sessionId);
            });
        });
    }

    function updateSession(sessionId, level, message, details) {
        console.log('Updating session ' + sessionId);
        inventory.sessionUpdate(sessionId, level, message, details, function(err) {
            if (err) {
                console.error(err);
            }
        });
    }
    function finishSession(session, details){
        console.log('Finishing session with ID:' + session._id);
        inventory.sessionFinish(session, details, function(result) {
            console.log('Session is finished ' + result);
        });
    }

    function getSession(date) {
        console.log('Getting session ' + date);
        return new Promise(function(resolve) {
            resolve(inventory.getSession(date));
        });
    }

    function installApp(serial) {
        client.uninstall(serial, 'com.basechord.aarons.androidrefresh.basechord').then(function() {
            console.log('Uninstalled previous version of app successfully for device: ' + serial);
            client.install(serial, apk)
                .then(function() {
                    console.log('App is installed for device ' + serial);
                    io.emit('app-installed', {device: serial});
                    // clear logcat before start the app
                    clearLogcat(serial).then(function(serialNo) {
                        checkDeviceProgress(serialNo)
                    }).catch(function(err) {
                        console.error('Something went wrong while clearing logcat for device: ' + serial + ' Error:' + err.stack);
                    });
                }).catch(function(err) {
                console.error('Something went wrong while installing the app on device: ' + serial + ' Error:' + err.stack);
            })
        }).catch(function(err) {
            console.error('Something went wrong while uninstalling the app on device: ' + serial + ' Error:' + err.stack);
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
        return client.shell(serial, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
            .then(adb.util.readAll)
            .then(function(output) {
                console.log('[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).catch(function(err) {
                console.error('Something went wrong while launching the app on device: ' + serial + ' Error:' + err.stack);
            });
    }

    function clearLogcat(serial) {
        console.log('Clearing logcat for device:' + serial);
        return new Promise(function(resolve, reject) {
            var aaronsClearLogcat = spawn('adb', ['-s', serial, 'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function(data) {
                console.log(data);
            });
            console.log('Logcat cleared for device: ' + serial);
            resolve(serial);
        })
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
        var aaronsLogcat = spawn('adb', ['-s', serial, 'logcat', '-s', 'Aarons_Result']);
        var passedTests = [];
        var failedTests = [];
        var failedAutoTests = [];
        var failedManualTests = [];
        var passedAutoTests = [];
        var passedManualTests = [];
        var imei = '';
        var appStartedDataJson = {};
        var sessionDate = new Date().toISOString();
        var unknownItem = {
            Type: 'Android',
            adbSerial: serial
        };
        aaronsLogcat.stdout.on('data', function(data) {
            data = decoder.write(data);
            console.log("parsing logcat data: " + data);
            if (IsJsonString(data.substring(data.indexOf("{")))) {
                // check if app started indexOf !== -1 means 'includes'
                if (data.indexOf('AppStartedCommand') !== -1) {
                    appStartedDataJson = JSON.parse(data.substring(data.indexOf("{")));
                    imei = appStartedDataJson.data.imei;
                    appStartedDataJson.sessionId = sessionDate;
                    getSerialLookup(imei).then(function(res) {
                        var item = res.item;
                        console.log(res.item);
                        item.numberOfAuto = appStartedDataJson.data.auto;
                        item.numberOfManual = appStartedDataJson.data.manual;
                        item.adbSerial = serial;
                        startSession(sessionDate, item).then(function(res) {
                            io.emit('app-start', appStartedDataJson);
                        }).catch(function(err) {
                            console.error(err);
                        });
                    }).catch(function(err) {
                        console.log('Failed to get serial number because of: ' + err);
                        unknownItem.Serial = imei;
                        unknownItem.numberOfAuto = appStartedDataJson.data.auto;
                        unknownItem.numberOfManual = appStartedDataJson.data.manual;
                        startSession(sessionDate, unknownItem).then(function(res) {
                            io.emit('app-start', appStartedDataJson);
                            updateSession(sessionDate, 'Info', 'Android device is not found in Inventory');
                        }).catch(function(err) {
                            console.error(err);
                        });
                    });
                }

                // check if wipe started indexOf !== -1 means 'includes'
                else if (data.indexOf('WipeStarted') !== -1) {
                    if (failedTests.length > 0) {
                        updateSession(sessionDate, 'Info', 'Android test fail', {'failedTests': failedTests});
                        finishSession(sessionDate, {'complete': false});
                        io.emit('android-reset', {
                            'status': 'Refresh Failed',
                            'imei': imei,
                            'failed_tests': failedTests,
                            'sessionId': sessionDate
                        });
                    } else {
                        updateSession(sessionDate, 'Info', 'Android refresh app has initiated a factory reset.');
                        finishSession(sessionDate, {'complete': true});
                        io.emit('android-reset', {
                            'status': 'Refresh Successful',
                            'imei': imei,
                            'sessionId': sessionDate
                        });
                    }
                }

                // tests progress indexOf === -1 means 'not includes'
                else if (data.indexOf('beginning') === -1) {
                    var testResultJson = JSON.parse(data.substring(data.indexOf("{")));
                    testResultJson.sessionId = sessionDate;
                    // add tests to arrays of tests
                    if (testResultJson.passed === true) {
                        passedTests.push(testResultJson.commandName);
                        if (testResultJson.commandName.indexOf('AutoTestCommand') !== -1) {
                            passedAutoTests.push(testResultJson.commandName);
                        } else {
                            passedManualTests.push(testResultJson.commandName);
                        }
                        if(failedManualTests.length + passedManualTests.length <= appStartedDataJson.data.manual) {
                            updateSession(sessionDate, 'Info Test', 'Android manual', {'passedManual':failedManualTests.length + passedManualTests.length,
                                'passedAuto':failedAutoTests.length + passedAutoTests.length });
                        }
                    }
                    if (failedAutoTests.length + passedAutoTests.length <= appStartedDataJson.data.auto) {
                        updateSession(sessionDate, 'Info Test', 'Android auto', {'passedAuto': failedAutoTests.length + passedAutoTests.length});
                    }
                    if (failedManualTests.length + passedManualTests.length <= appStartedDataJson.data.manual) {
                        updateSession(sessionDate, 'Info Test', 'Android manual', {'passedManual': failedManualTests.length + passedManualTests.length});
                    }
                    var message = testResultJson.commandName + ' ' + (testResultJson.passed ? 'passed' : 'failed') + '\n';
                    updateSession(sessionDate, 'Info', message, testResultJson.data);
                    io.emit("android-test", testResultJson);
                }
            }
        });
    }
}
