/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config.js');
    var partitions = require('./partitions.js');
    var content = require('./content.js')(io);
    var usbDrives = require('./usbCache.js');
    var Promise = require('bluebird');
    var fs = Promise.promisifyAll(require('fs'));
    var Session = require('../models/session.js')(io);
    var winston = require('winston');
    var spawn = require('child_process').spawn;
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');

    //Find existing USB drives
    //First, remove any broken symlinks to drives that no longer exist
    var fixBroken = spawn('find', ['-L', '/dev/disk/by-id/', '-maxdepth', '1', '-type', 'l', '-delete']);
    fixBroken.on('exit', function() {
        var findDrives = spawn('find', ['/dev/disk/by-id/', '-name', 'usb*', '-not', '-name', '*-part?']);
        findDrives.stdout.on('data', function(findData) {
            var lines = decoder.write(findData).split(/\n+/);
            for (var len = lines.length, i = 0; i < len; ++i) {
                if (lines[i].length > 0) {
                    winston.info('reading details for ' + lines[i]);
                    var lsblk = spawn('lsblk',
                        ['--bytes', '--output', 'NAME,SIZE', '--noheadings', '--nodeps', lines[i]]);
                    lsblk.stdout.on('data', function(lsblkData) {
                        var deviceInfo = decoder.write(lsblkData).trim().split(/\ +/);
                        add({
                            'id': deviceInfo[0],
                            'size': deviceInfo[1],
                            'status': 'not_ready',
                            'progress': 0
                        });
                    });
                }
            }
        });
    });

    function add(device) {
        var usbData = {
            'id': device.id,
            'size': device.size,
            'status': 'not_ready',
            'progress': 0
        };
        usbDrives.add(usbData.id, usbData);
        return isRefreshUsb(device.id).then(function(isInitialized) {
            if (isInitialized) {
                return prepare(device.id);
            } else {
                io.emit('new-usb-inserted');
                return Promise.resolve();
            }
        }).catch(function(err) {
            winston.error('Error adding USB', err);
        });
    }

    function remove(device) {
        usbDrives.remove(device.id);
    }

    function prepareAll() {
        return usbDrives.getAllUsbDrives().then(function(drives) {
            var promises = [];
            for (var key in drives) {
                if (drives.hasOwnProperty(key) && drives[key].status === 'not_ready') {
                    promises.push(prepare(key));
                }
            }
            return Promise.all(promises);
        });
    }

    function prepare(deviceId) {
        winston.info('Prepearing USB ' + deviceId);
        usbDrives.setStatus(deviceId, 'in_progress');
        var updatePromise = partitions.updatePartitions(deviceId).then(function() {
            return readSessions(deviceId);
        }).then(function() {
            return content.updateContent(deviceId);
        }).then(function() {
            return usbDrives.finishProgress(deviceId);
        }).finally(function() {
            return partitions.unmountPartitions(deviceId).then(function() {
                io.emit('usb-complete');
                usbDrives.endUpdate(deviceId);
            });
        }).catch(function(err) {
            winston.error('Prepearing USB ' + deviceId + ' failed', err);
            usbDrives.setStatus(deviceId, 'failed');
            usbDrives.endUpdate(deviceId);
        });
        usbDrives.startUpdate(deviceId, updatePromise);
    }

    function isRefreshUsb(deviceId) {
        return partitions.doPartitionsExist(deviceId);
    }

    function readSessions(deviceId) {
        return readSessionFiles(deviceId).then(function() {
            return readXboxSessions(deviceId);
        }).then(function() {
            return content.clearStatus(deviceId);
        });
    }

    function readSessionFiles(deviceId) {
        winston.info('Reading session files on ' + deviceId);
        var sessionsDirectory = '/mnt/' + deviceId + config.usbStatusPartition + '/sessions';
        return fs.readdirAsync(sessionsDirectory).then(function(files) {
            var promise = Promise.resolve();
            if (files.length > 0) {
                for (var i = 0, len = files.length; i < len; i++) {
                    winston.info('Session file found: ' + files[i]);
                    promise = promise.then(function(file) {
                        return fs.readFileAsync(sessionsDirectory + '/' + file, 'utf8').then(processUsbSession).catch(function(err) {
                            if (err.code !== 'ENOENT') {
                                throw err;
                            }
                        });
                    }(files[i]));
                }
            } else {
                return reportNoUsbSessions();
            }
            return promise;
        }).catch(function(err) {
            if (err.code !== 'ENOENT') {
                winston.error('Error reading session files', err);
            }
        });
    }

    function reportNoUsbSessions() {
        winston.info('No completed WindowsUsb or Mac sessions found');
        return Session.findOne({$or: [{'device.type': 'WindowsUsb'}, {'device.type': 'Mac'}], 'tmp.is_active': true}).then(function(session) {
            if (session !== null) {
                session.log('warn', 'USB drive inserted without successful refresh', '');
                session.tmp.currentStep = 'askRetry';
                return session.save();
            }
        });
    }

    function removeEmptyAttributes(obj) {
        Object.keys(obj).forEach(function(key) {
            if (obj[key] && typeof obj[key] === 'object') {
                removeEmptyAttributes(obj[key]);
            }
            else if (obj[key] === null || obj[key] === '') {
                delete obj[key];
            }
        });
    }

    function processUsbSession(data) {
        // Remove non-printable characters
        data = data.replace(/[^\x20-\x7E]+/g, '');
        var usbSession = JSON.parse(data);
        removeEmptyAttributes(usbSession);
        var usbSessionSuccess = usbSession.status === 'Success';
        winston.info('Refresh Session details', JSON.stringify(usbSession));
        return Session.aggregate([{
            $match: {
                'device.type': usbSession.device.type,
                'status': 'Incomplete'
            }
        }, {$project: {"serial_number_matches": {$cond: [{$eq: ["$device.serial_number", usbSession.device.serial_number]}, 1, 0]}}}, {
            $sort: {
                'serial_number_matches': -1,
                'document.tmp.is_active': -1,
                'document.start_time': 1
            }
        }]).limit(1).then(function(sessions) {
            if (sessions.length > 0) {
                return Session.findOne({'_id': sessions[0]._id}).then(function(session) {
                    session.status = usbSession.status;
                    session.start_time = usbSession.start_time;
                    session.end_time = usbSession.end_time;

                    // Item Number, Type, and SKU originate from Inventory data (in session.device)
                    // Manufacturer, Model, and Serial Number originate from the device (in usbSession.device)
                    session.device.manufacturer = usbSession.device.manufacturer;
                    session.device.model = usbSession.device.model;
                    session.device.serial_number = usbSession.device.serial_number;

                    session.logs = usbSession.logs;
                    return session.finish(usbSessionSuccess);
                });
            } else {
                var session = new Session(usbSession);
                return session.finish(usbSessionSuccess);
            }
        });
    }

    function reportNoXboxSessions() {
        winston.info('No completed Xbox sessions found');
        return Session.findOne({'device.type': 'XboxOne', 'tmp.is_active': true}).then(function(session) {
            if (session !== null) {
                session.log('warn', 'USB drive inserted without successful refresh', '');
                session.tmp.currentStep = 'askRetry';
                return session.save();
            }
        });
    }

    function readXboxSessions(device) {
        winston.info('Reading Xbox sessions');
        var systemUpdateDir = '/mnt/' + device + config.usbXboxPartition + '/$SystemUpdate';
        var unreportedSessions = 0;
        return fs.readFileAsync(systemUpdateDir + '/update.log', 'utf8').then(function(data) {
            unreportedSessions = data.split(/\r\n|\r|\n/).filter(function(value) {
                return value !== '';
            }).length / 2;
            if (unreportedSessions > 0) {
                winston.info('Found ' + unreportedSessions + ' completed Xbox sessions');
                return Session.find({'device.type': 'XboxOne', 'status': 'Incomplete'}).sort({
                    'tmp.is_active': -1,
                    'start_time': 1
                }).then(function(sessions) {
                    var promise = Promise.resolve();
                    for (var i = 0, len = sessions.length; i < len; i++) {
                        promise = promise.then(function(session) {
                            return session.finish(true);
                        }(sessions[i]));
                        unreportedSessions--;
                        if (unreportedSessions === 0) {
                            break;
                        }
                    }
                    while (unreportedSessions > 0) {
                        promise = promise.then(function() {
                            var session = new Session();
                            return session.start({'type': 'XboxOne'}).then(function() {
                                return session.finish(true);
                            });
                        });
                        unreportedSessions--;
                    }
                    return promise;
                });
            } else {
                return reportNoXboxSessions();
            }
        }).catch(function(err) {
            if (err.code === 'ENOENT') {
                reportNoXboxSessions();
            } else {
                winston.error('Error processing Xbox sessions', err);
            }
        });
    }

    return {
        'add': add,
        'remove': remove,
        'prepareAll': prepareAll,
        'isRefreshUsb': isRefreshUsb
    };
};
