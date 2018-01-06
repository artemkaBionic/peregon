/*jslint node: true */
'use strict';
var winston = require('winston');
require('winston-syslog').Syslog;
var station = require('./station.js');

winston.add(winston.transports.Syslog, {
    localhost: station.getName(),
    appName: 'kiosk'
});

process.stdout.on('error', function epipeFilter(err) {
    if (err.code === 'EPIPE') {
        return process.exit();
    }
    process.emit('error', err);
});
