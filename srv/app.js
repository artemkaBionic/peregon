var express = require('express');
var socket_io = require( "socket.io" );
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');
//var favicon = require('serve-favicon');
var logger = require('morgan');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var config = require('./config');
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');

// Express
var app = express();

// Socket.io
var io           = socket_io();
app.io           = io;

// MongoDB
var mongoDbUrl = 'mongodb://localhost/AppChord?connectTimeoutMS=30000';

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
            if (data.media === null || data.media === undefined) {
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
                    python.on('close', function (code) {
                        io.emit('device-apply-progress', {progress: 100, device: data.device});
                    });
                });
            }
        }
    });
    socket.on('verify-refresh', function(data) {
        console.log('A client requested to verify an ' + data.refreshType + ' refresh of item number ' + data.itemNumber);
        if (data.refreshType === 'xbox-one') {
            var session = initSession('Microsoft', 'Xbox One', data.itemNumber, data.sku);

            if (process.platform === 'win32') {
                console.log('Simulating verifying a refresh in a Windows development environment by waiting 3 seconds.');
                setTimeout(function() {
                    io.emit('verify-refresh-progress', {progress: 100, device: data.device});
                }, 3000);
            } else {
                logSession(session, 'Checking ' + data.device.id + ' for evidence that the refresh completed successfully.');
                var mountSource = '/dev/' + data.device.id + '1';
                var mountTarget = '/mnt/' + data.device.id + '1';
                fs.mkdir(mountTarget, function(err) {
                    if (err && err.code !== 'EEXIST') {
                        logSession(session, 'Error creating directory ' + mountTarget);
                        logSession(err);
                    } else {
                        logSession(session, 'Attempting to mount ' + mountSource + ' to ' + mountTarget);
                        var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                        mount.on('close', function (code) {
                            var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                            if (code !== 0) {
                                logSession(session, 'Error, failed to mount ' + mountSource + ' to ' + mountTarget);
                                logSession('mount command failed with error code ' + code);
                            } else {
                                logSession(session, 'Successfully mounted ' + mountSource + ' to ' + mountTarget);
                                var success = filesExist(systemUpdateDir, ['smcerr.log', 'update.cfg', 'update.log', 'update2.cfg']);
                                rimraf(path.join(mountTarget, '*'), function(err) {
                                    if (success) {
                                        logSession(session, 'It appears that the refresh completed successfully.');
                                        session.SessionState = session.CurrentState = 'Completed';
                                        closeSession(session);
                                        io.emit('verify-refresh-progress', {progress: 100, device: data.device});
                                    } else {
                                        logSession(session, 'It appears that the refresh failed.');
                                        session.CurrentState = 'VerifyRefreshFailed';
                                        session.SessionState = 'Aborted';
                                        closeSession(session);
                                        io.emit('verify-refresh-failed', {message: 'The factory reset was not completed.', device: data.device});
                                    }
                                    childProcess.spawn('umount', [mountTarget]);
                                });
                            }
                        });
                    }
                });
            }
        }
    });
});

//Initialize station connection status
childProcess.spawn('python', ['/opt/connection-status/connection-status.py']);

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

var initSession = function(manufacturer, model, itemNumber, sku) {
    var session = {
        'SessionDate': new Date(),
        'LastUpdated': new Date(),
        'DiagnoseOnly': false,
        'Computer': {
            'SKU': sku,
            'ServiceTag': null,
            'ComputerName': null,
            'AppChordId': null,
            'SerialNumber': null,
            'ComputerManufacturer': manufacturer,
            'Address': null,
            'NetworkAdapters': [],
            'Model': model,
            'ItemNumber': itemNumber
        },
        'RefreshStation': {
            'SKU': null,
            'ServiceTag': null,
            'ComputerName': null,
            'UUID': null,
            'AppChordId': null,
            'MsdmProductKey': null,
            'SerialNumber': null,
            'ComputerManufacturer': null,
            'Address': '192.168.108.5',
            'AssetTag': null,
            'NetworkAdapters': [  {
                'MacAddress': '',
                'IpAddress': '192.168.108.5' } ],
            'Model': null,
            'MsdmOemId': null },
        'Closed': null,
        'SessionState': 'Started',
        'AuditLogEntries': [],
        'CurrentState': 'DiskErasingStarted' };

    updateSessionDb(session);
    return session;
};

var updateSessionDb = function(session) {
    mongoClient.connect(mongoDbUrl, function(err, db) {
        assert.equal(err, null);
        if (session._id === undefined) {
            db.collection('RefreshSessions').insertOne(session, function (err, result) {
                assert.equal(err, null);
                console.log('Inserted refresh session:');
                console.log(session);
                db.close();
            });
        } else {
            db.collection('RefreshSessions').replaceOne({ "_id" : session._id }, session, function (err, result) {
                assert.equal(err, null);
                console.log('Updated refresh session:');
                console.log(session);
                db.close();
            });
        }
    });
};

var logSession = function(session, message) {
    session.LastUpdated = new Date();
    session.AuditLogEntries.push(message);
    console.log(message);
    updateSessionDb(session);
};

var closeSession = function(session) {
    session.Closed = new Date();
    updateSessionDb(session);
};

module.exports = app;
