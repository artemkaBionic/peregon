var express = require('express');
var socket_io = require( "socket.io" );
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var config = require('./config');

// Express
var app = express();

// Socket.io
var io           = socket_io();
app.io           = io;

// Common data
var data = {};
data.devices = [];

var routes = require('./routes')(io, data);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in ../src/assets/images
//app.use(favicon(__dirname + '../src/assets/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
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
if (app.get('env') === 'development') {
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
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// socket.io events
io.on( 'connection', function( socket )
{
    console.log( 'A client connected' );
    socket.on('device-apply', function (data) {
        if (process.platform === 'win32') {
            console.log('Simulating applying a device in a Windows development environment by waiting 3 seconds.');
            setTimeout(function() {
                io.emit('device-apply-progress', {progress: 100, device: data.device});
            }, 3000);
        } else {
            if (data.media === undefined) {
                console.error('A client requested to apply an undefined media package.');
            } else {
                console.log('A client requested to apply "' + data.media.name + '" to the ' + data.device.type + ' device ' + data.device.id);

                var mediaPackagePath = path.join(config.mediaPackagePath, data.media.id);
                var mediaPackageFile = path.join(mediaPackagePath, '.package.json');
                var mediaPackage = JSON.parse(fs.readFileSync(mediaPackageFile, 'utf8'));

                var fileSystem = 'fat32';
                if (mediaPackage.subtype === "xbox-one") {
                    fileSystem = 'ntfs';
                }

                var python = childProcess.spawn('python', ['/opt/kiosk/apply_media.py', '--package', data.media.id, '--device', data.device.id, '--file-system', fileSystem]);
                python.on('close', function (code) {
                    io.emit('device-apply-progress', {progress: 100, device: data.device});
                });
            }
        }
    });
    socket.on('verify-refresh', function(data) {
        console.log('A client requested to verify an ' + data.refreshType + ' refresh.');
        if (data.refreshType === 'xbox-one') {
            if (process.platform === 'win32') {
                console.log('Simulating verifying a refresh in a Windows development environment by waiting 3 seconds.');
                setTimeout(function() {
                    io.emit('verify-refresh-progress', 100);
                }, 3000);
            } else {
                console.log('Checking ' + data.device.id + ' for evidence that the refresh completed successfully.');
                var mountSource = '/dev/' + data.device.id + '1';
                var mountTarget = '/mnt/' + data.device.id + '1';
                if (!fs.existsSync(mountTarget)){
                    fs.mkdirSync(mountTarget);
                }
                var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                mount.on('close', function (code) {
                    var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                    if (code === 0) {
                        var success = filesExist(systemUpdateDir, ['smcerr.log', 'update.cfg', 'update.log', 'update2.cfg']);
                        rimraf(path.join(mountTarget, '*'), function(err) {
                            if (success) {
                                console.log('It appears that the refresh completed successfully.');
                                io.emit('verify-refresh-progress', 100);
                            } else {
                                console.log('It appears that the refresh failed.');
                                io.emit('verify-refresh-failed');
                            }
                            childProcess.spawn('umount', [mountTarget]);
                        });
                    }
                });
            }
        }
    });
});

var filesExist = function(directory, files) {
    if (files.length === 0) {
        return true;
    } else {
        var filePath = path.join(directory, files.pop());
        try {
            var stats = fs.statSync(filePath);
            return stats.isFile() && filesExist(directory, files);
        }
        catch (e) {
            return false;
        }
    }
};

module.exports = app;
