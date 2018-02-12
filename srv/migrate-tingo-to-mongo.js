// Migrate old data from TingoDB to MongoDB
/*jslint node: true */
'use strict';
module.exports = function(io) {
    var config = require('./config.js');
    var tingoEngine = require('tingodb')();
    var tingoDB = new tingoEngine.Db(config.kioskDataPath, {});
    var tingoSessions = tingoDB.collection('sessions');
    var mongoSession = require('./models/session.js')(io);
    var winston = require('winston');

    function migrateSession(session) {
        var newSession = JSON.parse(JSON.stringify(session)); //Clone object so we don't modify the original
        delete newSession._id;
        delete newSession.station;
        delete newSession.device.description;
        if (newSession.failedTests !== undefined) {
            newSession.failed_tests = newSession.failedTests;
        }
        for (var i = 0, len = newSession.logs.length; i < len; i++) {
            if (newSession.logs[i].details) {
                newSession.logs[i].details = JSON.stringify(newSession.logs[i].details).replace(/^\s*{*\s*|\s*}*\s*$/g, '').replace('failedTests', 'Failed tests');
            }
        }
        return mongoSession.findOneAndUpdate({'start_time': newSession.start_time}, newSession, {upsert: true}).then(function() {
            return new Promise(function(resolve, reject) {
                session.is_migrated = true;
                tingoSessions.update({'_id': session._id}, session, {upsert: false}, function(err) {
                    if (err) {
                        winston.error('Can not set is_migrated for session ' + session._id + ' in TingoDB', err);
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

    function fixIncompleteSessions() {
        var sixHoursAgo = new Date();
        sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
        mongoSession.updateMany({'status': 'Incomplete', 'start_time': {$lt: sixHoursAgo}}, {$set: {'status': 'Success'}}).then(function(raw) {
            winston.info('Fix incomplete sessions is finished', raw);
        }).catch(function(err) {
            winston.error('Failed to fix incomplete sessions', err);
        });
    }

    function migrate() {
        tingoSessions.find({'is_migrated': {$exists: false}}).toArray(function(err, sessions) {
            if (err) {
                winston.error('Failed to read sessions from TingoDB', err);
            } else {
                if (sessions.length > 0) {
                    var promises = [];
                    winston.info('Attempting to import ' + sessions.length + ' sessions from TingoDB');
                    for (var i = 0, len = sessions.length; i < len; i++) {
                        promises.push(function(session) {
                            migrateSession(session)
                        }(sessions[i]));
                    }
                    return Promise.all(promises).then(fixIncompleteSessions);
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
