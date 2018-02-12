// Migrate old data from TingoDB to MongoDB
/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('./config.js');
    var tingoEngine = require('tingodb')();
    var tingoDB = new tingoEngine.Db(config.kioskDataPath, {});
    var tingoSessions = tingoDB.collection('sessions');
    var mongoSession = require('./models/session.js')(io);
    var path = require('path');
    var shell = require('shelljs');
    var winston = require('winston');
    var Promise = require('bluebird');

    function migrateSession(session) {
        var newSession = JSON.parse(JSON.stringify(session)); //Clone object so we don't modify the original
        delete newSession._id;
        delete newSession.station;
        delete newSession.device.description;
        if (newSession.failedTests !== undefined) {
            newSession.failed_tests = newSession.failedTests;
            delete newSession.failedTests;
        }
        for (var i = 0, len = newSession.logs.length; i < len; i++) {
            if (newSession.logs[i].details) {
                newSession.logs[i].details = JSON.stringify(newSession.logs[i].details).replace(/^\s*{*\s*|\s*}*\s*$/g, '').replace('failedTests', 'Failed tests');
            }
        }
        if (newSession.status === 'Incomplete') {
            newSession.status = 'Success';
        }
        return mongoSession.findOneAndUpdate({'start_time': newSession.start_time}, newSession, {upsert: true}).then(function() {
            return new Promise(function(resolve, reject) {
                tingoSessions.remove({'_id': session._id}, function(err) {
                    if (err) {
                        winston.error('Failed to remove session ' + session._id + ' from TingoDB', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }).catch(function(err) {
            winston.error('Failed to migrate session ' + session._id + ' from TingoDB', err);
        })
    }

    function migrate() {
        shell.cp('-n', path.join(config.kioskDataPath, 'sessions'), path.join(config.kioskDataPath, 'sessions.bak'));
        tingoSessions.find({}).toArray(function(err, sessions) {
            if (err) {
                winston.error('Failed to read sessions from TingoDB', err);
            } else {
                if (sessions.length > 0) {
                    winston.warn('Importing ' + sessions.length + ' sessions from TingoDB');
                    Promise.mapSeries(sessions, migrateSession);
                } else {
                    winston.info('No sessions need to be migrated from TingoDB');
                    return Promise.resolve();
                }
            }
        });
    }

    migrate();
    //Attempt to migrate sessions every hour
    setInterval(function() {
        migrate();
    }, 3600000);
};
