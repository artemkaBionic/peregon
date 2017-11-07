/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config.js');
    var partitions = require('./partitions.js');
    var content = require('./content.js')(io);
    var fs = require('fs');
    var versions = require('./versions.js');
    var usbDrives = require('./usbCache.js');
    var Promise = require('bluebird');
    var BlueBirdQueue = require('bluebird-queue');
    var sessions = require('../session_storage/sessions.js');
    var inventory = require('../inventory.js');
    var winston = require('winston');
    var spawn = require('child_process').spawn;
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');

    //Find existing USB drives
    var find = spawn('find',
        ['/dev/disk/by-id/', '-name', 'usb*', '-not', '-name', '*-part?']);
    find.stdout.on('data', function(findData) {
        var lines = decoder.write(findData).split(/\n+/);
        for (var len = lines.length, i = 0; i < len; ++i) {
            if (lines[i].length > 0) {
                winston.info('reading details for ' + lines[i]);
                var lsblk = spawn('lsblk', [
                    '--bytes',
                    '--output',
                    'NAME,SIZE',
                    '--noheadings',
                    '--nodeps',
                    lines[i]]);
                lsblk.stdout.on('data', function(lsblkData) {
                    var deviceInfo = decoder.write(lsblkData).
                        trim().
                        split(/\ +/);
                    addUsb({
                        'id': deviceInfo[0],
                        'size': deviceInfo[1],
                        'status': 'not_ready',
                        'progress': 0
                    });
                });
            }
        }
    });

    function addUsb(device) {
        usbDrives.set(device.id, {
            'id': device.id,
            'size': device.size,
            'status': 'not_ready',
            'progress': 0
        });
        isRefreshUsb(device.id,
            function(err, isInitialized) {
                if (err) {
                    winston.log('error', err);
                } else {
                    if (isInitialized) {
                        prepareUsb(io);
                    }
                }
            });
    }

    function removeUsb(device, callback) {
        usbDrives.delete(device.id);
        clearItemFiles().then(callback);
    }

    function prepareUsb() {
        winston.info('Prepearing usb');
        var devices = usbDrives.getAllUsbDrives();
        for (var key in devices) {
            if (devices.hasOwnProperty(key) &&
                devices[key].status === 'not_ready') {
                var device = devices[key];
                usbDrives.setStatus(device.id, 'in_progress');
                partitions.updatePartitions(device.id, function(err) {
                    if (err) {
                        winston.info('Error while updating partitions');
                        winston.log('error', err);
                        partitions.unmountPartitions(device.id, function() {
                            usbDrives.finishProgress(device.id);
                            io.emit('usb-complete',
                                {err: err, device: device.id});
                        });
                    } else {
                        readSessions(device.id).then(function() {
                            content.updateContent(device.id, function(err) {
                                if (err) {
                                    winston.info('Error updating content');
                                    winston.info(err);
                                }
                                partitions.unmountPartitions(device.id,
                                    function() {
                                        usbDrives.finishProgress(device.id);
                                        io.emit('usb-complete',
                                            {err: err, device: device.id});
                                    });
                            });
                        });

                    }
                });
            }
        }
    }

    function isRefreshUsb(device, callback) {
        partitions.doPartitionsExist(device, callback);
    }

    function readSessions(device) {
        return new Promise(function(resolve) {
            readSessionFiles(device, function(err) {
                if (err) {
                    winston.info('Error reading session files');
                    winston.log('error', err);
                    io.emit('session-error', err);
                }
                readXboxSessions(device, function(err) {
                    if (err) {
                        winston.info('Error reading xbox files');
                        winston.log('error', err);
                        io.emit('session-error', err);
                    }
                    content.clearStatus(device);
                    resolve({success: true});
                });
            });
        });
    }

    function readSessionFiles(device, callback) {
        winston.info('Reading session files');
        var sessionsDirectory = '/mnt/' + device + config.usbStatusPartition +
            '/sessions';
        fs.readdir(sessionsDirectory, function(err, files) {
            if (err) {
                winston.log('info', err);
                callback(err);
            } else {
                if (files.length > 0) {
                    for (var i = 0; i < files.length; i++) {
                        console.log('File found:' + files[i]);
                        fs.readFile(sessionsDirectory + '/' + files[i], 'utf8',
                            function(err, data) {
                                if (err) {
                                    if (err.code === 'ENOENT') {
                                        callback(null);
                                    } else {
                                        callback(err);
                                    }
                                } else {
                                    try {
                                        // Remove non-printable characters
                                        data = data.replace(/[^\x20-\x7E]+/g,
                                            '');
                                        var usbSession = JSON.parse(data);
                                        winston.info(
                                            'Refresh Session details:');
                                        winston.info(usbSession);
                                        sessions.getSessionByParams({
                                            'device.item_number': usbSession.device.item_number,
                                            'status': 'Incomplete'
                                        }).then(function(session) {
                                            if (session === null) {
                                                usbSession._id = usbSession.start_time;
                                                sessions.set(usbSession._id,
                                                    usbSession);
                                            } else {
                                                usbSession._id = session._id;
                                                sessions.updateSession(
                                                    usbSession);
                                            }
                                            sessions.finish(usbSession._id,
                                                {
                                                    complete: usbSession.status ===
                                                    'Success'
                                                });
                                        });
                                    } catch (err) {
                                        winston.info('Error reading session');
                                        winston.log('error', err);
                                        callback(err);
                                    }
                                }
                            });
                    }
                    callback(null);
                } else {
                    callback(null);
                }
            }
        });
    }

    function readXboxSessions(device, callback) {
        winston.info('Reading xbox sessions');
        var systemUpdateDir = '/mnt/' + device + '1/$SystemUpdate';
        var usbItemFile = '/mnt/' + device + config.usbStatusPartition +
            '/item.json';
        var unreportedSessions = 0;
        fs.readFile(systemUpdateDir + '/update.log', 'utf8',
            function(err, data) {
                if (err) {
                    if (err.code !== 'ENOENT') {
                        callback(err);
                    }
                } else {
                    unreportedSessions = data.split(/\r\n|\r|\n/).
                        filter(function(value) {
                            return value !== '';
                        }).length / 2;
                    winston.info('There are ' + unreportedSessions +
                        ' Xbox Sessions');
                }
                fs.readFile(usbItemFile, 'utf8', function(err, item) {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            reportXboxSessions(unreportedSessions, callback);
                        } else {
                            callback(err);
                        }
                    } else {
                        item = JSON.parse(item);
                        if (item.Type === 'XboxOne') {
                            var sessionComplete = unreportedSessions > 0;
                            sessions.getSessionByParams({
                                'device.item_number': item.InventoryNumber,
                                'status': 'Incomplete'
                            }).then(function(session) {
                                if (session === null) {
                                    sessions.start(new Date().toISOString(),
                                        item, null, function(session) {
                                            sessions.finish(session._id,
                                                {complete: sessionComplete});
                                        });
                                } else {
                                    sessions.finish(session._id,
                                        {complete: sessionComplete});
                                }
                                unreportedSessions--;
                                reportXboxSessions(unreportedSessions,
                                    callback);
                            });
                        } else {
                            reportXboxSessions(unreportedSessions, callback);
                        }
                    }
                });
            });
    }

    function reportXboxSessions(count, callback) {
        winston.info('Reporting ' + count + ' xbox sessions');
        for (var i = 0; i < count; i++) {
            sessions.start(new Date().toISOString(), {Type: 'XboxOne'},
                null, function(session) {
                    sessions.finish(session._id, {complete: true});
                });
        }
        callback();
    }

    function createItemFiles(item) {
        console.log('Creating item files');
        var queue = new BlueBirdQueue({});
        var devices = usbDrives.getAllUsbDrives();
        for (var key in devices) {
            if (devices.hasOwnProperty(key) && devices[key].id) {
                queue.add(createItemFile(devices[key].id, item));
            }
        }
        return queue.start();
    }

    function clearItemFiles(deviceId) {
        console.log('Clearing item files');
        var queue = new BlueBirdQueue({});
        var devices = usbDrives.getAllUsbDrives();
        for (var key in devices) {
            if (devices.hasOwnProperty(key) && devices[key].id) {
                queue.add(clearItemFile(devices[key].id));
            }
        }
        return queue.start();
    }

    function createItemFile(device, item) {
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
                        partitions.unmountPartitions(device, function() {
                            resolve();
                        });

                    });
                }
            });
        });
    }

    function clearItemFile(device) {
        return new Promise(function(resolve, reject) {
            partitions.mountPartitions(device, function(err) {
                if (err) {
                    partitions.unmountPartitions(device, function(err) {
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

    return {
        'addUsb': addUsb,
        'removeUsb': removeUsb,
        'prepareUsb': prepareUsb,
        'isRefreshUsb': isRefreshUsb,
        'createItemFiles': createItemFiles,
        'clearItemFiles': clearItemFiles
    };
};
