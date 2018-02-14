/*jslint node: true */
'use strict';

/**
 * Module dependencies.
 */
var Promise = require('bluebird');
var config = require('./config.js');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
require('./lib/log.js');
var winston = require('winston');
var path = require('path');
var fs = Promise.promisifyAll(require('fs'));
var shell = require('shelljs');
var routes = require('./routes.js')(io);
var station = require('./controllers/stationController.js');
require('./android/android.js')(io);
require('./migrate-tingo-to-mongo')(io);

// Common data
var isDevelopment = process.env.NODE_ENV === 'development';

// Create data directory
fs.mkdirAsync(config.kioskDataPath).catch(function (err) {
    if (err.code !== 'EEXIST') {
        winston.error('Failed to create directory ' + config.kioskDataPath, err);
    }
});

// Create temp directory
fs.mkdirAsync(config.kioskTempPath).catch(function (err) {
    if (err.code === 'EEXIST') {
        shell.rm('-rf', path.join(config.kioskTempPath, '*'));
    } else {
        winston.error('Failed to create directory ' + config.kioskDataPath, err);
    }
});

// Clear mount directory
shell.exec('sync && umount /mnt/*', {silent: true}, function (code, stdout, stderr) {
    stderr = stderr.replace(/umount:.*not found\n/g, '').replace(/umount:.*not mounted\n/g, '');
    if (stderr.length === 0) {
        winston.info('Unmounted all devices successfully');
    } else {
        winston.error('Unmounting failed because of error code: ' + code + ', ' + stderr);
    }
    shell.rm('-rf', '/mnt/*');
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error(req.originalUrl + ' not found');
    err.status = 404;
    next(err);
});

if (isDevelopment) {
    // development error handler will print stacktrace
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
} else {
    // production error handler. No stacktraces leaked to user
    app.use(function (err, req, res, next) {
        winston.error('Unhandled error', err);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

// socket.io events
io.on('connection', function (socket) {
    winston.info('A client connected');
    station.getConnectionState(function (connectionState) {
        if (connectionState) {
            socket.emit('connection-status', connectionState);
        }
    });
    socket.on('disconnect', function () {
        winston.info('A client disconnected');
    });
});

/**
 * Start Express server.
 */
server.listen(app.get('port'), function () {
    winston.info('App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
    winston.info('  Press CTRL-C to stop\n');
});

module.exports = app;
