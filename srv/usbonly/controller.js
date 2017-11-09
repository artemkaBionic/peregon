/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('../config.js');
    var partitions = require('./partitions.js');
    var content = require('./content.js')(io);
    var versions = require('./versions.js');
    var usbDrives = require('./usbCache.js');
    var Promise = require('bluebird');
    var fs = Promise.promisifyAll(require('fs'));
    var sessions = require('../session_storage/sessions.js');
    var inventory = require('../inventory.js');
    var winston = require('winston');
    var spawn = require('child_process').spawn;
    var StringDecoder = require('string_decoder').StringDecoder;
    var decoder = new StringDecoder('utf8');

    //Find existing USB drives
    var find = spawn('find', ['/dev/disk/by-id/', '-name', 'usb*', '-not', '-name', '*-part?']);
    find.stdout.on('data', function(findData) {
        var lines = decoder.write(findData).split(/\n+/);
        for (var len = lines.length, i = 0; i < len; ++i) {
            if (lines[i].length > 0) {
                winston.info('reading details for ' + lines[i]);
                var lsblk = spawn('lsblk', ['--bytes', '--output', 'NAME,SIZE', '--noheadings', '--nodeps', lines[i]]);
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
        var usbData = {
            'id': device.id,
            'size': device.size,
            'status': 'not_ready',
            'progress': 0
        };
        usbDrives.set(usbData.id, usbData);
        return isRefreshUsb(device.id).then(function(isInitialized) {
            if (isInitialized) {
                return prepareUsb(device.id);
            }
        }).catch(function(err) {
            winston.error(err);
        });
    }

    function removeUsb(device) {
        usbDrives.delete(device.id);
        return clearItemFiles();
    }

    function prepareAllUsb() {
        var devices = usbDrives.getAllUsbDrives();
        var usbDrivesToPrepare = [];
        for (var key in devices) {
            if (devices.hasOwnProperty(key) && devices[key].status === 'not_ready') {
                usbDrivesToPrepare.push(prepareUsb(key));
            }
        }
        return Promise.all(usbDrivesToPrepare);
    }

    function prepareUsb(deviceId) {
        winston.info('Prepearing usb ' + deviceId);
        usbDrives.setStatus(deviceId, 'in_progress');
        return partitions.updatePartitions(deviceId).
            then(readSessions(deviceId)).
            then(content.updateContent(deviceId)).
            then(partitions.unmountPartitions(deviceId)).
            then(function() {
                io.emit('usb-complete');
            });
    }

    function isRefreshUsb(deviceId) {
        return partitions.doPartitionsExist(deviceId);
    }

    function readSessions(deviceId) {
        return readSessionFiles(deviceId).then(readXboxSessions(deviceId)).then(content.clearStatus(deviceId));
    }

    function readSessionFiles(deviceId) {
        winston.info('Reading session files on ' + deviceId);
        var sessionsDirectory = '/mnt/' + deviceId + config.usbStatusPartition + '/sessions';
        return fs.readdirAsync(sessionsDirectory).then(function(files) {
            var sessionFiles = [];
            for (var i = 0; i < files.length; i++) {
                winston.info('Session file found: ' + files[i]);
                sessionFiles.push(fs.readFileAsync(sessionsDirectory + '/' + files[i], 'utf8').then(processUsbSession));
            }
            return Promise.all(sessionFiles);
        }).catch(function(err) {
            winston.info(err);
        });
    }

    function processUsbSession(data) {
        // Remove non-printable characters
        data = data.replace(/[^\x20-\x7E]+/g, '');
        return JSON.parse(data).then(function(usbSession) {
            winston.info('Refresh Session details: ' +
                usbSession);
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
        });
    }

    function readXboxSessions(device, callback) {
        winston.info('Reading xbox sessions');
        var systemUpdateDir = '/mnt/' + device + '1/$SystemUpdate';
        var usbItemFile = '/mnt/' + device + config.usbStatusPartition + '/item.json';
        var unreportedSessions = 0;
        return fs.readFileAsync(systemUpdateDir + '/update.log', 'utf8').then(function(data) {
            unreportedSessions = data.split(/\r\n|\r|\n/).
                filter(function(value) {
                    return value !== '';
                }).length / 2;
            winston.info('There are ' + unreportedSessions + ' Xbox Sessions');
            return fs.readFileAsync(usbItemFile, 'utf8').then(JSON.parse).then(function(item) {
                if (item.Type === 'XboxOne') {
                    var sessionComplete = unreportedSessions > 0;
                    return sessions.getSessionByParams({
                        'device.item_number': item.InventoryNumber,
                        'status': 'Incomplete'
                    }).then(function(session) {
                        if (session === null) {
                            sessions.start(new Date().toISOString(), item, null).
                                then(function(session) {sessions.finish(session._id, {complete: sessionComplete});});
                        } else {
                            sessions.finish(session._id, {complete: sessionComplete});
                        }
                        unreportedSessions--;
                        return reportXboxSessions(unreportedSessions);
                    });
                } else {
                    return reportXboxSessions(unreportedSessions);
                }
            }).catch(function(err) {
                if (err.code === 'ENOENT') {
                    return reportXboxSessions(unreportedSessions);
                } else {
                    winston.error('Error reading ' + usbItemFile + ' ' + err.message);
                }
            });
        }).catch(function(err) {
            if (err.code !== 'ENOENT') {
                winston.error('Error reading ' + systemUpdateDir + '/update.log ' + err.message);
            }
        });
    }

    function reportXboxSessions(count) {
        winston.info('Reporting ' + count + ' xbox sessions');
        var newSessions = [];
        for (var i = 0; i < count; i++) {
            newSessions.push(sessions.start(new Date().toISOString(), {Type: 'XboxOne'}, null).then(function(session) {
                sessions.finish(session._id, {complete: true});
            }));
        }
        return Promise.all(newSessions);
    }

    function createItemFiles(item) {
        console.log('Creating item files');
        var itemFiles = [];
        var devices = usbDrives.getAllUsbDrives();
        for (var key in devices) {
            if (devices.hasOwnProperty(key) && devices[key].id) {
                itemFiles.push(createItemFile(devices[key].id, item));
            }
        }
        return Promise.all(itemFiles);
    }

    function clearItemFiles(deviceId) {
        console.log('Clearing item files');
        var itemFiles = [];
        var devices = usbDrives.getAllUsbDrives();
        for (var key in devices) {
            if (devices.hasOwnProperty(key) && devices[key].id) {
                itemFiles.push(clearItemFile(devices[key].id));
            }
        }
        return Promise.all(itemFiles);
    }

    function createItemFile(device, item) {
        return partitions.mountPartitions(device).
            then(content.createItemFile(device, item)).
            then(partitions.unmountPartitions(device)).
            catch(function(err) {
                partitions.unmountPartitions(device);
                winston.error('Error creating item file on usb ' + device + ', ' + err);
            });
    }

    function clearItemFile(device) {
        return partitions.mountPartitions(device).
            then(content.clearStatus(device)).
            then(partitions.unmountPartitions(device)).
            catch(function(err) {
                partitions.unmountPartitions(device);
                winston.error('Error creating item file on usb ' + device + ', ' + err);
            });
    }

    return {
        'addUsb': addUsb,
        'removeUsb': removeUsb,
        'prepareAllUsb': prepareAllUsb,
        'isRefreshUsb': isRefreshUsb,
        'createItemFiles': createItemFiles,
        'clearItemFiles': clearItemFiles
    };
};
