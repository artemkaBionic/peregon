// Express Router
/*jslint node: true */
'use strict';
module.exports = function(io) {
    var express = require('express');
    var inventory = require('./controllers/inventoryController.js');
    var station = require('./controllers/stationController.js');
    var usbDrives = require('./usbonly/usbCache.js');
    var usb = require('./usbonly/controller.js')(io);
    var Session = require('./models/session.js')(io);
    var winston = require('winston');

    var router = express.Router();

    router.get('/devices', function(req, res) {
        station.getUsbDrives().then(function(devices) {
            res.json(devices);
        }).catch(function(err) {
            winston.error('Failed to get usb drives', err);
            res.status(500).send();
        });
    });

    router.get('/devices/:id', function(req, res) {
        station.getUsbDrive(req.params.id).then(function(device) {
            res.json(device);
        }).catch(function(err) {
            winston.error('Failed to get usb drive ' + req.params.id, err);
            res.status(500).send();
        });
    });

    router.get('/inventory/:id', function(req, res) {
        inventory.getItem(req.params.id).then(function(item) {
            res.json(item);
        }).catch(function(err) {
            winston.error('Failed to get item ' + req.params.id, err);
            res.status(500).send();
        });
    });

    router.post('/inventory/lock/:imei', function(req, res) {
        inventory.lockDevice(req.params.imei).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            winston.error('Failed to lock device ' + req.params.imei, err);
            res.status(500).send();
        });
    });

    router.post('/inventory/unlock/:imei', function(req, res) {
        inventory.unlockDevice(req.params.imei, req.body.forService).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            winston.error('Failed to unlock device ' + req.params.imei, err);
            res.status(500).send();
        })
    });

    function startSession(id, reqBody, res) {
        var item;
        var tmp = {};
        if (reqBody.item === undefined) {
            item = reqBody;
        } else {
            item = reqBody.item;
            if (reqBody.tmp !== undefined) {
                tmp = reqBody.tmp;
            }
        }
        var session = new Session();
        if (id !== null) {
            session._id = id;
        }
        return session.start(item, tmp).then(function(result) {
            res.send(result);
        }).catch(function(err) {
            winston.error('Failed to start session', err);
            res.status(500).send();
        });
    }

    router.post('/sessions/start', function(req, res) {
        startSession(null, req.body, res);
    });

    router.post('/sessions/:id/start', function(req, res) {
        startSession(req.params.id, req.body, res);
    });

    router.post('/sessions/:id/setActive', function(req, res) {
        var isActive = req.body.isActive;
        Session.update({'tmp.is_active': true}, {$set: {'tmp.is_active': false}}, {multi: true}).then(function() {
            Session.findOneAndUpdate({_id: req.params.id}, {$set: {'tmp.is_active': isActive}}).then(function() {
                res.send();
            }).catch(function(err) {
                winston.error('Unable to update current step for session ' + req.params.id, err);
                res.status(500).send();
            });
        });
    });

    router.post('/sessions/:id/setCurrentStep', function(req, res) {
        var currentStep = req.body.currentStep;
        Session.findOneAndUpdate({_id: req.params.id}, {$set: {'tmp.currentStep': currentStep}}).then(function() {
            res.send();
        }).catch(function(err) {
            winston.error('Unable to update current step for session ' + req.params.id, err);
            res.status(500).send();
        });
    });

    router.post('/sessions/:id/updateItem', function(req, res) {
        var id = req.params.id;
        var item = req.body;
        Session.findOne({_id: id}).then(function(session) {
            session.device.item_number = item.item_number;
            session.device.type = item.product.type;
            session.device.sku = item.sku;
            if (!session.device.manufacturer) {
                session.device.manufacturer = item.manufacturer;
            }
            if (!session.device.model) {
                session.device.model = item.model;
            }
            session.save();
            res.send();
        }).catch(function(err) {
            winston.error('Unable to update item for session ' + req.params.id, err);
            res.status(500).send();
        });
    });

    router.post('/sessions/:id/addLogEntry', function(req, res) {
        var logEntry = {
            'timestamp': new Date(),
            'level': req.body.level,
            'message': req.body.message,
            'details': req.body.details
        };
        Session.findOneAndUpdate({_id: req.params.id}, {$push: {logs: logEntry}}).then(function() {
            res.send();
        }).catch(function(err) {
            winson.error('Failed to add log entry', err);
            res.status(500).send();
        });
    });

    router.post('/sessions/:id/finish', function(req, res) {
        Session.findOne({_id: req.params.id}).then(function(session) {
            if (session === null) {
                winston.error('Unable to finish, session ' + req.params.id + ' not found. Session completion details ' + JSON.stringify(req.body))
            } else {
                session.finish(req.body.complete, req.body.diagnose_only, req.body.reason).then(function() {
                    res.send();
                }).catch(function(err) {
                    winston.error('Failed to finish session', err);
                    res.status(500).send();
                });
            }
        });
    });

    router.get('/sessions', function(req, res) {
        Session.find().then(function(sessions) {
            res.json(sessions);
        }).catch(function(err) {
            winston.error('Failed to get all sessions', err);
            res.status(500).send();
        });
    });

    router.get('/sessions/incomplete/:itemNumber', function(req, res) {
        Session.findOne({
            'device.item_number': req.params.itemNumber,
            'status': 'Incomplete'
        }).then(function(session) {
            res.json(session);
        }).catch(function(err) {
            winston.error('Failed to get incomplete session for item ' + req.params.itemNumber, err);
            res.status(500).send();
        });
    });

    router.get('/isServiceCenter', function(req, res) {
        station.getIsServiceCenter().then(function(data) {
            res.json(data);
        }).catch(function(err) {
            winston.error('Failed to detect if this is a service center station', err);
            res.status(500).send();
        });
    });

    router.get('/getConnectionState', function(req, res) {
        station.getConnectionState().then(function(connectionState) {
            res.json(connectionState);
        }).catch(function(err) {
            winston.error('Failed to get connection state', err);
            res.status(500).send();
        });
    });

    router.post('/event/:name', function(req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;
        winston.info(event.name + ' event has been reported.', event.data);

        if (event.name === 'connection-status') {
            var connectionState = event.data;
            if (connectionState.isOnline) {
                sessions.resend();
            }
            io.emit(event.name, event.data);
        } else if (event.name === 'device-add') {
            usb.add(event.data).then(function() {
                io.emit(event.name, event.data);
            }).catch(function(err) {
                winston.error('Failed to add usb', err);
            });
        } else if (event.name === 'device-remove') {
            usb.remove(event.data);
            io.emit(event.name, event.data);
        }
        else {
            io.emit(event.name, event.data);
        }

        res.send();
    });

    router.post('/system/reboot', function(req, res) {
        winston.info('Rebooting...');
        station.reboot();
    });

    router.post('/system/shutdown', function(req, res) {
        winston.info('Shutting down...');
        station.shutdown();
    });

    router.post('/prepareAllUsb', function(req, res) {
        usb.prepareAll().then(function() {
            res.status(200).send();
        }).catch(function(err) {
            winston.error('Failed to prepare usb drives', err);
            res.status(500).send();
        });
    });

    router.get('/getAllUsbDrives', function(req, res) {
        usbDrives.getAllUsbDrives().then(function(drives) {
            res.json(drives);
        }).catch(function(err) {
            winston.error('Failed to get all usb drives', err);
            res.status(500).send();
        });
    });

    router.get('/getLowestUsbProgress', function(req, res) {
        usbDrives.getLowestUsbProgress().then(function(minProgress) {
            res.json(minProgress);
        }).catch(function(err) {
            winston.error('Failed to get lowest usb drive in progress', err);
            res.status(500).send();
        });
    });

    router.get('/getStationName', function(req, res) {
        res.json(station.getName());
    });

    return router;
};
