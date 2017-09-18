var express = require('express');
var fs = require('fs');
var path = require('path');
var config = require('./config');
var inventory = require('./inventory.js');
var station = require('./station.js');
var controller = require('./usbonly/controller');
var simultaneous = require('./simultaneous/simultaneous');
var usbDrives = require('./usbonly/usbCache');

module.exports = function(io, data) {
// Express Router
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
        console.log('request for get item was sent');
        inventory.getItem(req.params.id, function(item) {
            res.json(item);
        });
    });

    router.get('/data/inventory/lock/:id', function(req, res) {
        inventory.lockDevice(req.params.id, function(result) {
            res.json(result);
        });
    });

    router.get('/data/inventory/unlockForService/:imei', function(req, res) {
        inventory.unlockForService(req.params.imei, function(result) {
            res.json(result);
        });
    });

    router.get('/data/inventory/unlock/:id', function(req, res) {
        inventory.unlockDevice(req.params.id, function(result) {
            res.json(result);
        });
    });
    router.get('/data/inventory/sessions', function(req, res) {
        res.json(inventory.getSessions(req.body));
    });
    router.get('/data/getAllSessions', function(req, res) {
        res.json(inventory.getAllSessions());
    });
    router.get('/getAllUsbDrives', function(req, res) {
        res.json(inventory.getAllUsbDrives());
    });
    router.get('/getLowestUsbProgress', function(req, res) {
        res.json(inventory.getLowestUsbProgress());
    });
    router.post('/data/checkSession', function(req, res) {
        res.json(inventory.checkSessionInProgress(req.body));
    });
    router.get('/data/checkSessionByStartDate/:id', function(req, res) {
        console.log(req.params.id);
        res.json(inventory.checkSessionByStartDate(req.params.id));
    });
    router.get('/data/inventory/sessions/:id', function(req, res) {
        res.json(inventory.getSession(req.params.id));
    });

    router.post('/data/inventory/sessions/:id/start', function(req, res) {
        inventory.sessionStart(req.params.id, req.body, function(result) {
            res.json(result);
        });
    });
    router.get('/data/getAllSessionsByDevice/:id', function(req, res) {
            res.json(inventory.getAllSessionsByDevice(req.params.id));
    });
    router.post('/data/inventory/sessions/:id/update', function(req, res) {

        inventory.sessionUpdate(req.params.id, req.body.level, req.body.message, req.body.details, function(err, result) {
            if (err) {
                console.log(err);
            }
            res.json(result);
        });
    });

    router.post('/data/inventory/sessions/:id/updateSessionItem', function(req, res) {
       // console.log(req);
        inventory.sessionUpdateItem(req.params.id, req.body, req.body.level, req.body.message, req.body.details, function(err, result) {
            if (err) {
                console.log(err);
            }
            res.json(result);
        });
    });

    router.post('/data/inventory/sessions/:id/finish', function(req, res) {
        inventory.sessionFinish(req.params.id, req.body.details, function(result) {
            res.json(result);
        });
    });

    router.get('/data/packages/:contentType/:contentSubtype?', function(req, res) {
        try {
            console.log('Client requests ' + req.params.contentSubtype + ' ' + req.params.contentType + ' packages');
            switch (req.params.contentType) {
                case 'media':
                    if (isDevelopment) {
                        res.json([
                            {
                                "type": "media",
                                "subtype": "xbox-one",
                                "id": "bc76b9f7-02f9-42e3-a9b7-3383b5287f07",
                                "name": "Xbox One Refresh",
                                "size": 24204
                            },
                            {
                                "type": "media",
                                "subtype": "xbox-one",
                                "id": "6984e794-7934-4ecb-851a-da141da5a774",
                                "name": "Xbox One Update",
                                "size": 2000268
                            }
                        ]);
                    } else {
                        var packages = [];
                        console.log('Searching for media packages in ' + config.mediaPackagePath);
                        var dirs = getDirectories(config.mediaPackagePath);
                        var len = dirs.length;
                        for (var i = 0; i < len; ++i) {
                            var fullDir = path.join(config.mediaPackagePath, dirs[i]);
                            var packageFile = path.join(fullDir, '.package.json');
                            console.log('Attempting to parse ' + packageFile);
                            try {
                                var package = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                                if (package.type === "media" && ((typeof req.params.contentSubtype === 'undefined' && package.subtype === 'advertisement') || (typeof req.params.contentSubtype !== 'undefined' && package.subtype === req.params.contentSubtype))) {
                                    packages.push(package);
                                }
                            } catch (e) {
                                console.log('Error trying to read ' + packageFile);
                                console.log(e);
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
            console.log('Unable to get ' + req.params.contentType + ' packages.');
            console.log(e);
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
        })
    });
    router.get('/data/getConnectionState', function(req, res) {
        res.json(station.getConnectionState());
    });
    router.post('/event/:name', function(req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;

        console.log(event.name + ' event has been reported.');
        console.log(event.data);

        if (event.name === "connection-status") {
            var connectionState = event.data;
            station.setConnectionState(connectionState);
            if (connectionState.isOnline) {
                inventory.resendSessions(event.data);
            }
            io.emit(event.name, event.data);
        } else if (event.name === "device-add"){
            controller.isRefreshUsb(event.data.id, function(err, isInitialized) {
                if (err) {
                    console.error(err);
                } else {
                    if (isInitialized) {
                        controller.prepareUsb(io, {usb: event.data, item: null});
                    } else {
                        usbDrives.set(event.data.id, {id: event.data.id, status:'not_ready', progress: 0});
                        console.log(usbDrives.getAllUsbDrives());
                        io.emit(event.name, event.data);
                    }
                }
            })
        } else if (event.name === "device-remove"){
            usbDrives.delete(event.data.id);
            console.log(usbDrives.getAllUsbDrives());
            io.emit(event.name, event.data);
        }
        // else if (event.name === "usb-complete"){
        //     usbDrives.finishProgress(event.data.id);
        //     console.log(usbDrives.getAllUsbDrives());
        //     io.emit(event.name, event.data);
        // } else if (event.name === "usb-progress"){
        //     usbDrives.updateProgress(event.data.progress, event.data.id);
        //     console.log(usbDrives.getAllUsbDrives());
        //     io.emit(event.name, event.data);
        // }
        else {
            io.emit(event.name, event.data);
        }


        res.json();
    });


    router.post('/system/reboot', function(req, res) {
        console.log('Rebooting...');
        station.reboot();
    });

    router.post('/system/shutdown', function(req, res) {
        console.log('Shutting down...');
        station.shutdown();
    });

    router.post('/prepareUsb', function(req, res) {
        controller.prepareUsb(io, req.body);
        res.status(200).send();
    });

    router.post('/readSession', function(req, res) {
        controller.readSession(io, req.body, function(err, isSessionComplete) {
            if (err) {
                res.status(500).json(null);
            } else {
                res.status(200).json(isSessionComplete);
            }
        });
    });

    return router;
};
