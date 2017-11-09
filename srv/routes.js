// Express Router
/*jslint node: true */
'use strict';
module.exports = function(io) {
    var express = require('express');
    var fs = require('fs');
    var path = require('path');
    var config = require('./config.js');
    var inventory = require('./inventory.js');
    var station = require('./station.js');
    var controller = require('./usbonly/controller.js')(io);
    var simultaneous = require('./simultaneous/simultaneous.js');
    var usbDrives = require('./usbonly/usbCache.js');
    var sessions = require('./session_storage/sessions.js')(io);
    var winston = require('winston');

    var router = express.Router();

    var isDevelopment = process.env.NODE_ENV === 'development';

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    router.get('/data/devices', function(req, res) {
        station.getUsbDrives(function(err, devices) {
            res.json(devices);
        });
    });

    router.get('/data/devices/:id', function(req, res) {
        station.getUsbDrive(req.params.id, function(err, device) {
            res.json(device);
        });
    });

    router.get('/data/inventory/:id', function(req, res) {
        winston.log('info', 'Request for get item which was sent');
        inventory.getItem(req.params.id, function(item) {
            res.json(item);
        });
    });

    router.post('/data/inventory/lock/:imei', function(req, res) {
        inventory.lockDevice(req.params.imei, function(result) {
            res.json(result);
        });
    });
    router.post('/data/inventory/unlock/:imei', function(req, res) {
        inventory.unlockDevice(req.params.imei, req.body.forService,
            function(result) {
                res.json(result);
            });
    });

    router.post('/data/sessions/:id/start', function(req, res) {
        sessions.start(req.params.id, req.body, {}).then(function(result) {
            res.json(result);
        });
    });
    router.post('/data/sessions/deviceBroken', function(req, res) {
        sessions.deviceBroken(req.body).then(function(result) {
            res.json(result);
        });
    });
    router.post('/data/sessions/:id/addLogEntry', function(req, res) {
        sessions.addLogEntry(req.params.id, req.body.level, req.body.message,
            req.body.details).then(function() {
            res.json();
        });
    });

    router.post('/data/sessions/:id/finish', function(req, res) {
        sessions.finish(req.params.id, req.body).then(function(result) {
            res.json(result);
        });
    });
    router.get('/data/packages/:contentType/:contentSubtype?',
        function(req, res) {
            try {
                winston.log('info', 'Client requests ' +
                    req.params.contentSubtype + ' ' + req.params.contentType +
                    ' packages');
                switch (req.params.contentType) {
                    case 'media':
                        if (isDevelopment) {
                            res.json([
                                {
                                    'type': 'media',
                                    'subtype': 'xbox-one',
                                    'id': 'bc76b9f7-02f9-42e3-a9b7-3383b5287f07',
                                    'name': 'Xbox One Refresh',
                                    'size': 24204
                                },
                                {
                                    'type': 'media',
                                    'subtype': 'xbox-one',
                                    'id': '6984e794-7934-4ecb-851a-da141da5a774',
                                    'name': 'Xbox One Update',
                                    'size': 2000268
                                }
                            ]);
                        } else {
                            var packages = [];
                            winston.log(
                                'info', 'Searching for media packages in ' +
                                config.mediaPackagePath);
                            var dirs = getDirectories(config.mediaPackagePath);
                            var len = dirs.length;
                            for (var i = 0; i < len; ++i) {
                                var fullDir = path.join(config.mediaPackagePath,
                                    dirs[i]);
                                var packageFile = path.join(fullDir,
                                    '.package.json');
                                winston.log('info', 'Attempting to parse ' +
                                    packageFile);
                                try {
                                    var pkg = JSON.parse(
                                        fs.readFileSync(packageFile, 'utf8'));
                                    if (pkg.type === 'media' &&
                                        ((typeof req.params.contentSubtype ===
                                            'undefined' && pkg.subtype ===
                                            'advertisement') ||
                                            (typeof req.params.contentSubtype !==
                                                'undefined' &&
                                                pkg.subtype ===
                                                req.params.contentSubtype))) {
                                        packages.push(pkg);
                                    }
                                } catch (e) {
                                    winston.log(
                                        'error', 'Error trying to read ' +
                                        packageFile);
                                    winston.log('error', e);
                                }
                            }
                            res.json(packages);
                        }
                        break;
                    default:
                        res.json(null);
                        break;
                }
            } catch (e) {
                winston.log('error', 'Unable to get ' + req.params.contentType +
                    ' packages.');
                winston.log('error', e);
            }
        });

    router.get('/data/isServiceCenter', function(req, res) {
        station.getIsServiceCenter(function(data) {
            res.json(data);
        });
    });
    router.get('/data/package/:sku', function(req, res) {
        station.getPackage(req.params.sku, function(data) {
            res.json(data);
        });
    });
    router.get('/data/getConnectionState', function(req, res) {
        station.getConnectionState(function(connectionState) {
            res.json(connectionState);
        });
    });
    router.post('/event/:name', function(req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;
        winston.log('info', event.name + ' event has been reported.');
        winston.log('info', event.data);

        if (event.name === 'connection-status') {
            var connectionState = event.data;
            if (connectionState.isOnline) {
                sessions.resend();
            }
            io.emit(event.name, event.data);
        } else if (event.name === 'device-add') {
            controller.addUsb(event.data).then(function() {
                io.emit(event.name, event.data);
            });
        } else if (event.name === 'device-remove') {
            controller.removeUsb(event.data).then(function() {
                io.emit(event.name, event.data);
            });
        }
        else {
            io.emit(event.name, event.data);
        }

        res.json();
    });

    router.post('/system/reboot', function(req, res) {
        winston.log('info', 'Rebooting...');
        station.reboot();
    });

    router.post('/system/shutdown', function(req, res) {
        winston.log('info', 'Shutting down...');
        station.shutdown();
    });

    router.post('/prepareAllUsb', function(req, res) {
        controller.prepareAllUsb().then(function() {
            res.status(200).send();
        });
    });

    router.post('/getSessionsByParams', function(req, res) {
        sessions.getSessionsByParams(req.body).then(function(response) {
            res.json(response);
        });
    });

    router.post('/getSessionByParams', function(req, res) {
        sessions.getSessionByParams(req.body).then(function(session) {
            res.json(session);
        });
    });

    router.post('/updateSessionItem',
        function(req, res) {
            sessions.sessionUpdateItem(req.body.params, req.body.item).
                then(function(result) {
                    inventory.resendSessions();
                    res.json({sessionUpdated: result});
                }).
                catch(function(err) {
                    winston.log(
                        'error', 'Something went wrong while updating session item for serial:' +
                        req.params.id);
                });
        });
    router.get('/getAllUsbDrives', function(req, res) {
        res.json(inventory.getAllUsbDrives());
    });
    router.get('/getLowestUsbInProgress', function(req, res) {
        res.json(inventory.getLowestUsbInProgress());
    });
    router.post('/createItemFiles', function(req, res) {
        controller.createItemFiles(req.body.item).then(function() {
            res.status(200).send();
        });
    });
    router.post('/updateStatus', function(req, res) {
        usbDrives.setStatus('sdc', 'in_progress');
        res.json({success: true});
    });
    router.get('/getStationName', function(req, res) {
        res.json(station.getName());
    });
    return router;
};
