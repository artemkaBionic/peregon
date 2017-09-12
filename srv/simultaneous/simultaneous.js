'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
var client = adb.createClient();
var apk = __dirname + '/app-release.apk';
var spawn = require('child_process').spawn;
var station = require('../station');
var sessions = require('../sessionCache');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var inventory = require('../inventory');
exports.deviceBridge = deviceBridge;

function deviceBridge(io) {
    var devices = [];
    console.log('Device bridge started');

    client.trackDevices()
        .then(function (tracker) {
            tracker.on('add', function (device) {
                console.log('Device %s was plugged in', device.id);
                setTimeout(function(){
                    io.emit('android-add',{});
                    console.log('Device ' + device.id + ' is ready to install app');
                    installApp(device.id);
                },8000);
                // client.waitForDevice(device.id).then(function(authorizedDevice) {
                //     console.log(authorizedDevice + ' is authorized and ready to install app.');
                //     io.emit('android-add',{});
                //     installApp(authorizedDevice);
                // }).catch(function(err) {
                //     console.log(err);
                // });

            });
            tracker.on('remove', function(device) {
                console.log('Device %s was unplugged', device.id);
                var index = devices.indexOf(device.id);
                var sessionId = inventory.getSessionInProgressByDevice({'adbSerial': device.id}).session_id;
                console.log(sessionId + 'sessionID');
                if (sessionId !== undefined) {
                    finishSession(sessionId, {'complete': false});
                }
                if (index > -1) {
                    devices.splice(index, 1);
                    io.emit('android-remove',{});
                }
            });
        })
        .catch(function (err) {
            console.error('Something went wrong while connecting device:', err.stack)
        });
    // check for expired sessions every 10 minutes
    setInterval(function() {
        checkSessionExpired();
    }, 600000);
    // 3600000 - hour 600000 - 10 mins
    function checkSessionExpired() {
        console.log('check for expired sessions');
        var sessions = inventory.getAllSessions();
        for (var key in sessions) {
            if (sessions.hasOwnProperty(key)) {
                if(sessions[key].status === 'Incomplete') {
                    var sessionDate = new Date(sessions[key].start_time);
                    var plusOneHour = sessionDate.getTime() + (3600000);
                    var expireDate = new Date(plusOneHour);
                    var currentDate = new Date();
                    if (currentDate > expireDate) {
                        console.log('Session with key:' + key + ' is expired');
                        io.emit('android-session-expired', {'sessionId': key, 'device': sessions[key].device.serial_number});
                        setTimeout(function(){
                            finishSession(key, {'complete': false});
                            io.emit('session-expired-confirmation', {});
                        },5000);
                    } else {
                        console.log('No expired sessions.');
                    }
                }
            }
        }
    }
    function getSerialLookup(imei){
        return new Promise(function(resolve, reject) {
            inventory.getSerialLookup(imei, function(item) {
                if (JSON.stringify(item).toLowerCase().indexOf('did not find device') === -1){
                    resolve(item);
                } else{
                    reject('Device not found');
                }
            });
        })
    }
    function startSession(sessionDate, item){
        return new Promise(function(resolve) {
            inventory.sessionStart(sessionDate, item, function () {
                resolve(sessionDate);
            });
        });
    }
    function updateSession(sessionDate, level, message, details){
        inventory.sessionUpdate(sessionDate, level, message, details, function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
    function finishSession(sessionDate, details){
        inventory.sessionFinish(sessionDate, details, function(result) {
            console.log('Session is finished ' + result);
        });
    }

    function installApp(serial){
        client.uninstall(serial,'com.basechord.aarons.androidrefresh.basechord').then(function(){
            console.log('Uninstalled previous version of app successfully for device: ' + serial);
            client.install(serial, apk)
                .then(function () {
                    console.log('App is installed for device ' + serial);
                    io.emit('app-installed', {device: serial});
                    // clear logcat before start the app
                    clearLogcat(serial).then(function(serialNo){
                        checkDeviceProgress(serialNo)
                    }).catch(function(err) {
                        console.log('Something went wrong while clearing logcat for device: ' + serial + ' Error:' + err.stack)
                    });
                }).catch(function (err) {
                    console.error('Something went wrong while installing the app on device: ' + serial + ' Error:' + err.stack)
               })
        });
    }
    function checkDeviceProgress(serial) {
        console.log(devices.length + ' devices in process');
        if(devices.length === 0){
            console.log('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        } else if(devices.indexOf(serial) === -1){
            console.log('Launching refresh app on device:' + serial);
            devices.push(serial);
            startApp(serial);
        }
    }
    function startApp(serial) {
        return client.shell(serial, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
            .then(adb.util.readAll)
            .then(function (output) {
                console.log('[%s] %s', serial, output.toString().trim());
                readLogcat(serial);
            }).catch(function(err) {
                console.error('Something went wrong while launching the app on device: ' + serial + ' Error:' + err.stack)
            });
    }

    function clearLogcat(serial){
        return new Promise(function (resolve, reject) {
            var aaronsClearLogcat = spawn('adb', ['-s', serial,'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function (data) {
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
         var aaronsLogcat = spawn('adb', ['-s' ,serial ,'logcat' , '-s', 'Aarons_Result']);
         var passedTests = [];
         var failedTests = [];
         var failedAutoTests = [];
         var failedManualTests = [];
         var passedAutoTests = [];
         var passedManualTests = [];
         var imei = '';
         var appStartedDataJson = '';
         var sessionDate = new Date().toISOString();
         var unknownItem = {
             Type:'Android',
             adbSerial: serial
         };
         var deviceAuthorized = true;
         aaronsLogcat.stdout.on('data', function (data) {
              if(IsJsonString(decoder.write(data).substring(decoder.write(data).indexOf("{")))) {
                  // check if app started indexOf !== -1 means 'includes'
                  if (decoder.write(data).indexOf('AppStartedCommand') !== -1) {
                      appStartedDataJson = JSON.parse(decoder.write(data).substring(decoder.write(data).indexOf("{")));
                      imei = appStartedDataJson.data.imei;
                      getSerialLookup(imei).then(function (res) {
                          var item = res.item;
                          console.log(res.item);
                          item.numberOfAuto = appStartedDataJson.data.auto;
                          item.numberOfManual = appStartedDataJson.data.manual;
                          item.adbSerial = serial;
                          startSession(sessionDate, item).then(function(res) {
                              io.emit('app-start', appStartedDataJson);
                          }).catch(function(err) {
                              console.log(err);
                          });
                      }).catch(function (err) {
                          console.log('Failed to get serial number because of: ' + err);
                          unknownItem.Serial = imei;
                          unknownItem.numberOfAuto = appStartedDataJson.data.auto;
                          unknownItem.numberOfManual = appStartedDataJson.data.manual;
                          //unknownItem.adbSerial = serial;
                          deviceAuthorized = false;
                          startSession(sessionDate, unknownItem).then(function(res) {
                              io.emit('app-start', appStartedDataJson);
                              updateSession(sessionDate, 'Info', 'Android device is not found in Inventory');
                          }).catch(function(err) {
                              console.log(err);
                          });
                      });
                  }

                  // check if vipe started indexOf !== -1 means 'includes'
                  else if (decoder.write(data).indexOf('VipeStarted') !== -1) {
                      getSerialLookup(imei).then(function (res) {
                          if (deviceAuthorized) {
                              // if passed tests array length = to number of all tests then session was successful
                              if (passedTests.length === (appStartedDataJson.data.auto + appStartedDataJson.data.manual)) {
                                  updateSession(sessionDate, 'Info', 'Android refresh app has initiated a factory reset.');
                                  finishSession(sessionDate, {'complete': true});
                                  io.emit('android-reset', {'status': 'Refresh Successful', 'imei': res.item.Serial});
                              } else {
                                  updateSession(sessionDate, 'Info', 'Android test fail', {'failedTests':failedTests});
                                  finishSession(sessionDate, {'complete': false});
                                  io.emit('android-reset', {'status': 'Refresh Failed', 'imei': res.item.Serial, 'failed_tests': failedTests});
                              }
                          } else {
                              if (passedTests.length === (appStartedDataJson.data.auto + appStartedDataJson.data.manual)) {
                                  updateSession(sessionDate, 'Info', 'Android refresh app has initiated a factory reset.');
                                  io.emit('android-reset', {'status': 'Refresh Successful', 'imei': res.item.Serial});
                              } else {
                                  updateSession(sessionDate, 'Info', 'Android test fail', {'failedTests':failedTests});
                                  io.emit('android-reset', {'status': 'Refresh Failed', 'imei': res.item.Serial, 'failed_tests': failedTests});
                              }
                          }
                      }).catch(function (err) {
                          console.log('Failed to get serial number because of: ' + err);
                      });

                  }
                  // tests progress indexOf === -1 means 'not includes'
                  else if (decoder.write(data).indexOf('beginning') === -1) {
                          //var testResultJson = '';
                          var testResultJson = JSON.parse(decoder.write(data).substring(decoder.write(data).indexOf("{")));
                          // add tests to arrays of tests
                          if (testResultJson.passed === true) {
                              passedTests.push(testResultJson.commandName);
                              if (testResultJson.commandName.indexOf('AutoTestCommand') !== -1){
                                  passedAutoTests.push(testResultJson.commandName);
                              } else {
                                  passedManualTests.push(testResultJson.commandName);
                              }
                          } else {
                              failedTests.push(testResultJson.commandName);
                              if (testResultJson.commandName.indexOf('AutoTestCommand') !== -1){
                                  failedAutoTests.push(testResultJson);
                              } else {
                                  failedManualTests.push(testResultJson.commandName);
                              }
                          }
                          if(failedAutoTests.length + passedAutoTests.length <= appStartedDataJson.data.auto) {
                              updateSession(sessionDate, 'Info Test', 'Android auto', {'passedAuto':failedAutoTests.length + passedAutoTests.length });
                          }
                          if(failedManualTests.length + passedManualTests.length <= appStartedDataJson.data.manual) {
                              updateSession(sessionDate, 'Info Test', 'Android manual', {'passedManual':failedManualTests.length + passedManualTests.length });
                          }
                          var message = testResultJson.commandName + ' ' + (testResultJson.passed ? 'passed' : 'failed') + '\n';
                          updateSession(sessionDate, 'Info', message, testResultJson.data);
                          io.emit("android-test", testResultJson);
                  }
              }
         });
    }
}
