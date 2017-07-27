'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
var client = adb.createClient();
var apk = 'srv/simultaneous/app-debug.apk';
var spawn = require('child_process').spawn;
// var station = require('./station');
// const sessions = require('./sessionCache');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
exports.deviceBridge = deviceBridge;

function deviceBridge(io) {
    console.log('Device bridge started');
    client.trackDevices()
        .then(function (tracker) {
            tracker.on('add', function (device) {
                console.log('Device %s was plugged in', device.id);
                client.waitForDevice(device.id).then(function (device2) {
                    console.log(device2 + ' is authorized and ready to install app.');
                    io.emit('android-add',{});
                    installApp(device2);
                    //readLogcat();
                });
            });
            tracker.on('remove', function (device) {
                console.log('Device %s was unplugged', device.id);
                io.emit('android-remove',{});

            });
            tracker.on('end', function () {
                console.log('Tracking stopped');
            });
        })
        .catch(function (err) {
            reject(err);
            console.error('Something went wrong:', err.stack)
        });

    function installApp(device) {
        io.emit('app-installed', {device: device});
        client.install(device, apk)
            .then(function () {
                console.log('App is installed for device ' + device);
                io.emit('app-installed', {device: device});
                //startApp(device);
                clearLogcat().then(function(){
                    startApp(device);
                });
            });
    }

    function startApp(deviceId) {
        client.listDevices()
            .then(function (devices) {
                return Promise.map(devices, function (device) {
                    return client.shell(device.id, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
                    // Use the readAll() utility to read all the content without
                    // having to deal with the events. `output` will be a Buffer
                    // containing all the output.
                        .then(adb.util.readAll)
                        .then(function (output) {
                            console.log('[%s] %s', device.id, output.toString().trim())
                        })
                })
            })
            .then(function () {
                readLogcat();
                console.log('Done, app is started on device: ' + deviceId)
            })
            .catch(function (err) {
                console.error('Something went wrong:', err.stack)
            })
    }
    function clearLogcat(){
        return new Promise(function (resolve, reject) {
            var aaronsClearLogcat = spawn('adb', ['logcat', '-c']);
            aaronsClearLogcat.stdout.on('data', function (data) {
                console.log(data);
            });
            console.log('logcat cleared');
            resolve();
        })
    }
    function readLogcat() {
        console.log('reading logcat');
        var aaronsLogcat = spawn('adb', ['logcat', '-s', 'Aarons_Result']);
        aaronsLogcat.stdout.on('data', function (data) {
            console.log(decoder.write(data));
            if (decoder.write(data).includes('AppStartedCommand')) {
                var appStartedData = JSON.parse(decoder.write(data).match(/\{([\S\s]*)}/)[0]);
                io.emit('app-start', appStartedData);
            } else if (decoder.write(data).includes('VipeStarted')) {
                io.emit('android-reset', {});
            } else {
                if (!decoder.write(data).includes('beginning')) {
                    var testData = JSON.parse(decoder.write(data).match(/\{([\S\s]*)}/)[0]);
                    io.emit("android-test", testData);
                }
            }
        });

    }
}
