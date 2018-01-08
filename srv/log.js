/*jslint node: true */
'use strict';
var winston = require('winston');
require('winston-syslog').Syslog;
var station = require('./station.js');

winston.add(winston.transports.Syslog, {
    localhost: station.getName(),
    appName: 'kiosk'
});

process.on('uncaughtException', function(err) {
    winston.error(err);
});
