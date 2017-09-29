'use strict';
var config = require('../config');
var partitions = require('./partitions');
var content = require('./content');
var fs = require('fs');
var versions = require('./versions');
var usbDrives = require('./usbCache');
var Promise = require('bluebird');
var BlueBirdQueue = require('bluebird-queue');
var sessions = require('../session_storage/sessions');
var inventory = require('../inventory');
var winston = require('winston');
exports.onlyReadSessions = function(io){
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].status === 'not_ready') {
            var device = devices[key];
            readSessions(io, device.id).then(function(status) {

            });
        }
    }
};
exports.prepareUsb = function(io) {
    winston.info('Prepearing usb');
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].status === 'not_ready'){
            var device = devices[key];
            usbDrives.setStatus(device.id, 'in_progress');
           // console.log(device);
           // console.log(usbDrives.getAllUsbDrives());
            //readSessions(io, device.id, function(){
            readSessions(io, device.id).then(function(status) {
                console.log(status);
                partitions.updatePartitions(device.id, function(err) {
                    if (err) {
                        winston.info('Error while updating partitions');
                         winston.log('error', err);
                         partitions.unmountPartitions(device.id, function() {
                             winston.info('Unmounting partitions from if.');
                             usbDrives.finishProgress(device.id);
                             io.emit('usb-complete', {err: err, device: device.id});
                         });
                     } else {
                         content.updateContent(io, device.id, function(err) {
                             winston.info('Update content from else statement');
                             if (err) {
                                 winston.info('Error updating content');
                                 winston.info(err);
                             }
                             partitions.unmountPartitions(device.id, function() {
                                 winston.info('unmountPartitions from else statement');
                                 usbDrives.finishProgress(device.id);
                                 io.emit('usb-complete', {err: err, device: device.id});
                             });
                         });
                     }
                 });
            });

           // });
        }
    }
};
exports.isRefreshUsb = function(device, callback){
    //var device = data.usb.id;
    versions.getUsbVersions(device, function(err, res){
        if(err) {
            winston.log('error', err);
            callback(err, null);
        } else {
            if (res === null) {
                callback(null, false);
            } else {
                callback(null, true);
            }
        }
    });
};
function readSessions(io, device){
    return new Promise(function(resolve) {
        readSessionFiles(io, device, function(err){
            if (err) {
                winston.info('Error reading session files');
                winston.log('error', err);
                io.emit('session-error', err);
            }
            readXboxSessions(io, device, function(err) {
                if (err) {
                    winston.info('Error reading xbox files');
                    winston.log('error', err);
                    io.emit('session-error', err);
                }
                content.clearStatus(device);
                resolve({success:true});
            });
        })
    });
}
function readSessionFiles(io, device, callback) {
    winston.info('Reading session files');
    partitions.mountPartitions(device, function(err) {
        //var systemUpdateDir = '/mnt/' + device + '1/$SystemUpdate';
        var sessionsDirectory = '/mnt/' + device + config.usbStatusPartition + 'sessions';
        fs.readdir(sessionsDirectory, function(err, files){
            if (err) {
               winston.log('info', err);
               callback(err);
            } else {
                for (var i = 0; i < files.length; i++) {
                    fs.readFile(sessionsDirectory + files[i], 'utf8', function (err, data) {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                callback(null);
                            } else {
                                callback(err);
                            }
                        } else {
                            try {
                                // Remove non-printable characters
                                data = data.replace(/[^\x20-\x7E]+/g, '');

                                var usbSession = JSON.parse(data);
                                winston.info('Refresh Session details:');
                                winston.info(usbSession);
                                sessions.getSessionByParams({'device.item_number': usbSession.device.item_number, 'status': 'Incomplete'}).then(function(session) {
                                    if (session === null){
                                        usbSession._id = usbSession.start_time;
                                        sessions.set(usbSession._id, usbSession);
                                    } else {
                                        usbSession._id = session._id;
                                        sessions.updateSession(usbSession);
                                    }
                                    inventory.sessionFinish(usbSession._id, {complete: usbSession.status === 'Success'}, function(session){
                                        io.emit('session-complete', session);
                                        callback(null);
                                    });
                                });
                            } catch (err) {
                                winston.info('Error reading session');
                                winston.log('error',err);
                                callback(err);
                            } finally {
                                try {
                                    content.clearStatus(device);
                                    //Disable EFI boot to prevent Refresh Station booting to USB
                                } catch (err) {
                                    winston.info('Error finalizing reading sessions');
                                    winston.log('error',err);
                                    io.emit('session-complete', {session:{device:{Type:''}}});
                                    callback(err);
                                }
                            }
                        }
                    });
                }
            }
        });

    });
}
function readXboxSessions(io, device, callback){
    winston.info('Reading xbox sessions');
    var systemUpdateDir = '/mnt/' + device + '1/$SystemUpdate';
    var usbItemFile = '/mnt/' + device + config.usbStatusPartition +
        '/item.json';
    var unreportedSessions = 0;
    fs.readFile(systemUpdateDir + '/update.log', 'utf8', function (err, data) {
        if (err) {
            if (err.code !== 'ENOENT') {
                callback(err);
            }
        } else {
            unreportedSessions = data.split(/\r\n|\r|\n/).filter(function(value){
                return value !== ''
            }).length / 2;
            winston.info('There are ' + unreportedSessions + ' Xbox Sessions');
        }
            fs.readFile(usbItemFile, 'utf8', function (err, item) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        reportXboxSessions(io, unreportedSessions, callback);
                    }  else {
                        callback(err);
                    }
                } else {
                    item = JSON.parse(item);
                    if (item.Type === 'XboxOne') {
                        var sessionComplete = unreportedSessions > 0;
                        sessions.getSessionByParams({'device.item_number': item.InventoryNumber, 'status': 'Incomplete'}).then(function(session) {
                            if (session === null){
                                inventory.sessionStart(new Date().toISOString(), item, null, function(session){
                                    inventory.sessionFinish(session._id, {complete: sessionComplete}, function(session){
                                        io.emit('session-complete', session);
                                    });
                                });
                            } else {
                                inventory.sessionFinish(session._id, {complete: sessionComplete}, function(session){
                                    io.emit('session-complete', session);
                                });

                            }
                            unreportedSessions--;
                            reportXboxSessions(io, unreportedSessions, callback);
                        });
                    } else {
                        reportXboxSessions(io, unreportedSessions, callback);
                    }
                }
            });
    });
}

function reportXboxSessions(io, count, callback) {
    winston.info('Reporting ' + count + ' xbox sessions');
    for (var i = 0; i < count; i++){
        inventory.sessionStart(new Date().toISOString(), {Type: 'XboxOne'}, null, function(session){
            inventory.sessionFinish(session._id, {complete: true}, function(session){
                io.emit('session-complete', session);

            });
        });
    }
    callback();
}
exports.createItemFiles = function(item){
    console.log('Creating item files');
    var queue = new BlueBirdQueue({});
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].id) {
            queue.add(createItemFile(devices[key].id, item));
        }
    }
    return queue.start();
};
exports.clearItemFiles = function () {
    console.log('Clearing item files');
    var queue = new BlueBirdQueue({});
    var devices = usbDrives.getAllUsbDrives();
    for (var key in devices) {
        if (devices.hasOwnProperty(key) && devices[key].id) {
            queue.add(clearItemFile(devices[key].id));
        }
    }
    return queue.start();
};
function createItemFile(device, item){
    return new Promise(function(resolve, reject) {
        partitions.mountPartitions(device, function(err) {
            if (err) {
                partitions.unmountPartitions(device, function() {
                    reject(err);
                });
            } else {
                content.createItemFile(device, item, function(err) {
                    if (err) {
                        reject(err);
                    }
                    partitions.unmountPartitions(device, function(){
                        resolve();
                    });

                });
            }
        });
    });
}
function clearItemFile(device){
    return new Promise(function(resolve, reject) {
        partitions.mountPartitions(device, function(err) {
            if (err) {
                partitions.unmountPartitions(device, function(err){
                    reject(err);
                });
            } else {
                content.clearStatus(device);
                partitions.unmountPartitions(device, null);
                resolve();
            }
        });
    });
}
