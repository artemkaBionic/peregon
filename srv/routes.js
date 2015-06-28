var express = require('express'),
    fs = require('fs'),
    path = require('path');

module.exports = function(io, data) {
// Express Router
    var router = express.Router();

    function removeDevice(id) {
        for (var i = data.devices.length - 1; i >= 0; i--) {
            if(data.devices[i].id === id) {
                data.devices.splice(i, 1);
            }
        }
    };

    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    router.get('/data/devices', function (req, res) {
        res.send(data.devices);
    });

    router.get('/data/packages/:contentType', function (req, res) {
        switch(req.params.contentType) {
            case 'media':
                //var packagePath = '/srv/media';
                var packagePath = 'D:\\srv\\media';
                var packages = [];
                var dirs = getDirectories(packagePath);
                var len = dirs.length;
                for (var i = 0; i < len; ++i) {
                    var fullDir = path.join(packagePath, dirs[i]);
                    var packageFile = path.join(fullDir, 'package.json');
                    var package = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                    packages.push(package);
                }
                res.send(packages);
                break;
            default:
                res.send(null);
                break;
        }
    });

    router.post('/event/:name', function (req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;

        console.log(event.name + ' event has been reported.');

        if (event.name === "device_add") {
            removeDevice(event.data.id); //Ensure that there are no duplicate devices
            data.devices.push(event.data);
        } else if (event.name === "device_remove") {
            removeDevice(event.data.id);
        }

        io.emit('event', event);
        res.send();
    });

    return router;
};
