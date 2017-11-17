/*jslint node: true */
'use strict';
var express = require('express');
var socketIo = require('socket.io');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var config = require('./config');
var station = require('./station.js');
// Express
var app = express();
// Socket.io
var io = socketIo();
app.io = io;
// Common data
var isDevelopment = process.env.NODE_ENV === 'development';

require('./log');
var winston = require('winston');

var routes = require('./routes.js')(io);
require('./simultaneous/simultaneous.js')(io);
// Create data directory
fs.mkdir(config.kioskDataPath, function(err) {
    if (err && err.code !== 'EEXIST') {
        winston.log('error', 'Failed to create directory ' +
            config.kioskDataPath, err);
    }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in ../src/assets/images
//app.use(favicon(__dirname + '../src/assets/images/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (isDevelopment) {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    winston.log('error', err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// socket.io events
io.on('connection', function(socket) {
    winston.log('info', 'A client connected');
    socket.on('device-apply', function(data) {
        if (isDevelopment) {
            winston.log('info', 'A client requested to apply media to device.');
            winston.log('info', data);
            winston.log('info',
                'Simulating applying a device in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                io.emit('device-apply-progress',
                    {progress: 100, device: data.device});
            }, 3000);
        } else {
            if (typeof data.media === 'undefined' || data.media === null) {
                winston.log('error',
                    'A client requested to apply an undefined media package.');
                io.emit('device-apply-failed', {
                    message: 'Media package is missing.',
                    device: data.device
                });
            } else {
                winston.log('info', 'A client requested to apply "' +
                    data.media.name + '" to the ' + data.device.type +
                    ' device ' + data.device.id);
                var mediaPackagePath = path.join(config.mediaPackagePath,
                    data.media.id);
                var mediaPackageFile = path.join(mediaPackagePath,
                    '.package.json');
                fs.readFile(mediaPackageFile, 'utf8',
                    function(err, packageFileData) {
                        var mediaPackage = JSON.parse(packageFileData);
                        var fileSystem = 'fat32';
                        if (mediaPackage.subtype === 'xbox-one') {
                            fileSystem = 'ntfs';
                        }

                        var python = childProcess.spawn('python', [
                            '/opt/kiosk/apply_media.py',
                            '--package',
                            data.media.id,
                            '--device',
                            data.device.id,
                            '--file-system',
                            fileSystem]);
                        python.on('close', function(code) {
                            io.emit('device-apply-progress',
                                {progress: 100, device: data.device});
                        });
                    });
            }
        }
    });
    station.getConnectionState(function(connectionState) {
        if (connectionState) {
            socket.emit('connection-status', connectionState);
        }
    });
});

module.exports = app;
