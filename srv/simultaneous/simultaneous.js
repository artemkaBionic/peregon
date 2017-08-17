'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
var client = adb.createClient();
var apk = 'srv/simultaneous/app-release.apk';
var spawn = require('child_process').spawn;
var station = require('../station');
const sessions = require('../sessionCache');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
var inventory = require('../inventory');
exports.deviceBridge = deviceBridge;
function deviceBridge(io) {
    console.log('Device bridge started');
    client.trackDevices()
        .then(function (tracker) {
            tracker.on('add', function (device) {
                console.log('Device %s was plugged in', device.id);
                client.waitForDevice(device.id).then(function(authorizedDevice) {
                    console.log(authorizedDevice + ' is authorized and ready to install app.');
                    io.emit('android-add',{});
                    installApp(authorizedDevice);
                }).catch(function(err) {
                    console.log(err);
                });
            });
            tracker.on('remove', function(device) {
                console.log('Device %s was unplugged', device.id);
                io.emit('android-remove',{});
            });
        })
        .catch(function (err) {
            console.error('Something went wrong while connecting device:', err.stack)
        });

    function getSerialLookup(imei){
        return new Promise(function(resolve, reject) {
            inventory.getSerialLookup(imei, function(item) {
                if (!JSON.stringify(item).toLowerCase().includes('did not find device')){
                    resolve(item);
                } else{
                    reject('Device not found');
                }
            });
        })
    }
    function startSession(item){
        inventory.sessionStart(item.InventoryNumber, item, function(){
            console.log('Session for device with inventory number:' + item.InventoryNumber + ' had started');
        })
    }
    function updateSession(inventoryNumber, level, message, details){
        inventory.sessionUpdate(inventoryNumber, level, message, details, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('Session for device with inventory number:' + inventoryNumber + ' was updated');
            }
        });
    }
    function finishSession(inventoryNumber, details){
        inventory.sessionFinish(inventoryNumber, details, function(result) {
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
                        startApp(serialNo)
                    }).catch(function(err) {
                        console.log('Something went wrong while clearing logcat for device: ' + serial + ' Error:' + err.stack)
                    });
                }).catch(function (err) {
                    console.error('Something went wrong while installing the app on device: ' + serial + ' Error:' + err.stack)
               })
        });
    }
    function startApp(serial, inventoryNumber) {
        return client.shell(serial, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
            .then(adb.util.readAll)
            .then(function (output) {
                console.log('[%s] %s', serial, output.toString().trim());
                readLogcat(serial, inventoryNumber);
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
    function readLogcat(serial) {
         console.log('Reading logcat for device: ' + serial);
         var aaronsLogcat = spawn('adb', ['-s' ,serial ,'logcat' , '-s', 'Aarons_Result']);
         var imei = '';
         aaronsLogcat.stdout.on('data', function (data) {
              console.log(decoder.write(data));
              if (decoder.write(data).includes('AppStartedCommand')) {
                  var appStartedData = decoder.write(data).substring(decoder.write(data).indexOf("{"));
                  var appStartedDataJson = JSON.parse(appStartedData);
                  imei = appStartedDataJson.data.imei;
                  getSerialLookup(imei).then(function(res) {
                      startSession(res.item);
                  }).catch(function(err) {
                      console.log('Failed to get serial number because of: ' + err);
                  });
                 io.emit('app-start', appStartedData);
              } else if (decoder.write(data).includes('VipeStarted')) {
                  getSerialLookup(imei).then(function(res) {
                      finishSession(res.item.InventoryNumber, {'complete': true});
                      console.log(sessions.get(res.item.InventoryNumber));
                  }).catch(function(err) {
                      console.log('Failed to get serial number because of: ' + err);
                  });
                  io.emit('android-reset', {});
              } else {
                    if (!decoder.write(data).includes('beginning')) {
                        var testResult = decoder.write(data).substring(decoder.write(data).indexOf("{"));
                        var testResultJson = JSON.parse(testResult);
                        var message = testResultJson.commandName + ' ' + (testResultJson.passed ? 'passed' : 'failed') + '\n';
                        getSerialLookup(imei).then(function(res) {
                            updateSession(res.item.InventoryNumber,'Info', message, testResultJson.data);
                        }).catch(function(err) {
                            console.log('Failed to get serial number because of: ' + err);
                        });
                        io.emit("android-test", testResultJson);
                    }
              }
         });

    }
}
