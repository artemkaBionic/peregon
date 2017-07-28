'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
var client = adb.createClient();
var apk = 'srv/simultaneous/app-debug.apk';
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
                    //starting a session by getting item number by serial number
                    getSerialLookup('0000000000').then(function(item) {
                        //starting session
                        console.log('starting session');
                       return startSession(item, authorizedDevice)
                       }).catch(function (err) {
                            console.log(err + ': ' + authorizedDevice);
                        });

                }).catch(function(err) {
                    console.log(err);
                });
            });
            tracker.on('remove', function(device) {
                console.log('Device %s was unplugged', device.id);
                io.emit('android-remove',{});
            });
            tracker.on('end', function() {
                console.log('Tracking stopped');
            });
        })
        .catch(function (err) {
            console.error('Something went wrong while connecting device:', err.stack)
        });
    function getSerialLookup(authorizedDevice){
        return new Promise(function(resolve, reject) {
            inventory.getSerialLookup(authorizedDevice, function(item) {
                //var item2 = item;
                if (!JSON.stringify(item).toLowerCase().includes('did not find device')){
                    resolve(item);
                } else{
                    reject('Device not found');
                }
            });
        })
    }
    function startSession(item, serial){
        return new Promise(function(resolve) {
            inventory.sessionStart(item.item.InventoryNumber, item, function(){
                resolve(item.item.InventoryNumber);
                installApp(serial, item.item.InventoryNumber);
            })
        })
    }
    function updateSession(inventoryNumber, level, message, details){
        return new Promise(function(resolve) {
            inventory.sessionUpdate(inventoryNumber, level, message, details, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    resolve(inventoryNumber)
                }
            });
        })
    }
    function finishSession(inventoryNumber, details){
        inventory.sessionFinish(inventoryNumber, details, function(result) {
            console.log('Session is finished ' + result);
        });
    }

    function installApp(serial, inventoryNumber) {
        console.log('Installing app for device:' + serial);
        client.install(serial, apk)
            .then(function () {
                console.log('App is installed for device ' + serial);
                io.emit('app-installed', {device: serial});
                // clear logcat before start the app
                clearLogcat(serial).then(function(serialNo){
                    startApp(serialNo, inventoryNumber)
                }).catch(function(err) {
                    console.log('Something went wrong while clearing logcat for device: ' + serial + ' Error:' + err.stack)
                });
            }).catch(function (err) {
                updateSession(inventoryNumber , 'Info', 'Session failed.', 'Failed to install app')
                    .then(function(){
                        return finishSession(inventoryNumber,{'complete': false});
                    });
               // console.log(sessions.get('0000000000'));
                console.error('Something went wrong while installing the app on device: ' + serial + ' Error:' + err.stack)
            })

    }

    function startApp(serial, inventoryNumber) {
        return client.shell(serial, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
            .then(adb.util.readAll)
            .then(function (output) {
                console.log('[%s] %s', serial, output.toString().trim());
                readLogcat(serial, inventoryNumber);
            }).catch(function(err) {
                console.error('Something went wrong while launching the app on device: ' + serial + ' Error:' + err.stack)
                updateSession(inventoryNumber , 'Info', 'Session failed.', 'Failed to launch app')
                    .then(function(){
                        return finishSession(inventoryNumber,{'complete': false});
                    });
            });

    }
    function clearLogcat(serial){
        return new Promise(function (resolve, reject) {
            var aaronsClearLogcat = spawn('adb', ['-s', serial,'logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function (data) {
                console.log(data);
            });
            console.log('logcat cleared for device: ' + serial);
            resolve(serial);
        })
    }
    function readLogcat(serial, inventoryNumber) {
        console.log('reading logcat for device: ' + serial);
        var aaronsLogcat = spawn('adb', ['-s' ,serial ,'logcat' , '-s', 'Aarons_Result']);
         aaronsLogcat.stdout.on('data', function (data) {
             var deviceTestsResults = {};
             // console.log(decoder.write(data));
             if (decoder.write(data).includes('AppStartedCommand')) {
                 var appStartedData = JSON.parse(decoder.write(data).match(/\{([\S\s]*)}/)[0]);
                 io.emit('app-start', appStartedData);
             } else if (decoder.write(data).includes('VipeStarted')) {
                 io.emit('android-reset', {});
             } else {
                 if (!decoder.write(data).includes('beginning')) {
                     //console.log(decoder.write(data).match(/\{([\S\s]*)}/));
                     var testData = JSON.parse(decoder.write(data).match(/\{([\S\s]*)}/)[0]);
                     io.emit("android-test", testData);
                 }
             }

         });

    }
}
