var express = require('express');
var fs = require('fs');
var path = require('path');
var config = require('./config');

module.exports = function(io, data) {
// Express Router
    var router = express.Router();

    function removeDevice(id) {
        for (var i = data.devices.length - 1; i >= 0; i--) {
            if(data.devices[i].id === id) {
                data.devices.splice(i, 1);
            }
        }
    }

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    router.get('/data/devices', function (req, res) {
        res.send(data.devices);
    });

    router.get('/data/packages/:contentType/:contentSubtype?', function (req, res) {
        try {
            console.log('Client requests ' + req.params.contentSubtype + ' ' + req.params.contentType + ' packages');
            switch (req.params.contentType) {
                case 'media':
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
                            if (package.type === "media" && ((req.params.contentSubtype === undefined && package.subtype === 'advertisement') || (req.params.contentSubtype !== undefined && package.subtype === req.params.contentSubtype))) {
                                packages.push(package);
                            }
                        } catch (e) {
                            console.log('Error trying to read ' + packageFile);
                            console.log(e);
                        }
                    }
                    res.send(packages);
                    break;
                default:
                    res.send(null);
                    break;
            }
        } catch (e) {
            console.log('Unable to get ' + req.params.contentType + ' packages.');
            console.log(e);
        }
    });

    router.post('/event/:name', function (req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;

        console.log(event.name + ' event has been reported.');
        console.log(event.data);

        if (event.name === "device-add") {
            removeDevice(event.data.id); //Ensure that there are no duplicate devices
            data.devices.push(event.data);
        } else if (event.name === "device-remove") {
            removeDevice(event.data.id);
        }

        io.emit('event', event);
        res.send();
    });

    return router;
};
