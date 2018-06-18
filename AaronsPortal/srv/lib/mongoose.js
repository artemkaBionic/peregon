'use strict';
var winston = require('winston');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect('mongodb://localhost/AppChord', {useMongoClient: true});

mongoose.connection.on('connected', function () {
    winston.info('Mongoose connected.');
});

module.exports = mongoose;
