var express = require('express');
var socket_io = require("socket.io");
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
//var favicon = require('serve-favicon');
var logger = require('morgan');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var config = require('./config');
var station = require('./station');
//var controller = require('./usbonly')
var simultaneous = require('./simultaneous/simultaneous');
// Express
var app = express();

// Socket.io
var io = socket_io();
app.io = io;
simultaneous.deviceBridge(io);
// Common data
var isDevelopment = process.env.NODE_ENV === 'development';

var routes = require('./routes')(io);

// Create data directory
fs.mkdir(config.kioskDataPath, function(err) {
    if (err && err.code !== 'EEXIST') {
        console.error('Failed to create directory ' + config.kioskDataPath, err);
    }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in ../src/assets/images
//app.use(favicon(__dirname + '../src/assets/images/favicon.ico'));
app.use(logger('dev'));
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
    console.log(err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// socket.io events
io.on('connection', function(socket) {
    console.log('A client connected');
    socket.on('device-apply', function(data) {
        if (isDevelopment) {
            console.log('A client requested to apply media to device.');
            console.log(data);
            console.log('Simulating applying a device in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                io.emit('device-apply-progress', {progress: 100, device: data.device});
            }, 3000);
        } else {
            if (typeof data.media === 'undefined' || data.media === null) {
                console.error('A client requested to apply an undefined media package.');
                io.emit('device-apply-failed', {message: 'Media package is missing.', device: data.device});
            } else {
                console.log('A client requested to apply "' + data.media.name + '" to the ' + data.device.type + ' device ' + data.device.id);

                var mediaPackagePath = path.join(config.mediaPackagePath, data.media.id);
                var mediaPackageFile = path.join(mediaPackagePath, '.package.json');
                fs.readFile(mediaPackageFile, 'utf8', function(err, packageFileData) {
                    var mediaPackage = JSON.parse(packageFileData);
                    var fileSystem = 'fat32';
                    if (mediaPackage.subtype === "xbox-one") {
                        fileSystem = 'ntfs';
                    }

                    var python = childProcess.spawn('python', ['/opt/kiosk/apply_media.py', '--package', data.media.id, '--device', data.device.id, '--file-system', fileSystem]);
                    python.on('close', function(code) {
                        io.emit('device-apply-progress', {progress: 100, device: data.device});
                    });
                });
            }
        }
    });
});

//Initialize station connection status
if (isDevelopment) {
    //Simulate on online state for development purposes
    station.setConnectionState({
        "isOnline": true,
        "name": "C0204-FW",
        "description": "Meraki MX64 Cloud Managed Router",
        "port": "4"
    });
} else {
    childProcess.spawn('python', ['/opt/connection-status/connection-status.py']);
}

module.exports = app;
