'use strict';
var config = require('../config');
var adb = require('adbkit');
var Promise = require('bluebird');
var client = adb.createClient();
var apk = 'srv/simultaneous/app-debug.apk';
var spawn = require('child_process').spawn;
var logcat = require('adbkit-logcat');
const stream = require('stream');

var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder('utf8');
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
exports.deviceBridge = function(io) {
    return new Promise(function(resolve, reject){
        resolve();
        var devices = [];
        client.trackDevices()
            .then(function(tracker) {
                tracker.on('add', function(device) {
                    devices.push(device.id);
                    var uniqueDevices = devices.filter(onlyUnique);
                    console.log(uniqueDevices);
                    console.log('Device %s was plugged in', device.id);
                    client.waitForDevice(device.id).then(function(device) {
                        console.log(device + ' is authorized and ready to install app.');
                        installApp(device);
                    });
                });
                tracker.on('remove', function(device) {
                    console.log('Device %s was unplugged', device.id);
                });
                tracker.on('end', function() {
                    console.log('Tracking stopped');
                });
            })
            .catch(function(err) {
                reject(err);
                console.error('Something went wrong:', err.stack)
            });

    function installApp(device){
        io.emit('device-added',{device: device});
        client.install(device, apk)
            .then(function() {
                console.log('App is installed for device ' + device);
                io.emit('app-installed',{device: device});
                startApp(device);
            });
    }
    function startApp(deviceId){
        client.listDevices()
            .then(function(devices) {
                return Promise.map(devices, function(device) {
                    return client.shell(device.id, 'am start -n com.basechord.aarons.androidrefresh.basechord/com.basechord.aarons.androidrefresh.basechord.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER')
                    // Use the readAll() utility to read all the content without
                    // having to deal with the events. `output` will be a Buffer
                    // containing all the output.
                        .then(adb.util.readAll)
                        .then(function(output) {
                            console.log('[%s] %s', device.id, output.toString().trim())
                        })
                })})
            .then(function() {
                readLogcat(deviceId);
                console.log('Done, app is started on device: ' + deviceId)
            })
            .catch(function(err) {
                console.error('Something went wrong:', err.stack)
            })
    }
    function readLogcat(deviceId){
        // client.openLogcat(deviceId,[],function(err, logcat){
        //     var proc = spawn(logcat);
        //     console.log(proc);
        //
        // });
        var proc = spawn('adb', ['logcat', '-s', 'Aarons_Result']);

        proc.stdout.on('data',function(data){
            console.log(decoder.write(data));
        })
    }
    });
};
