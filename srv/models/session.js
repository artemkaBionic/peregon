'use strict';
module.exports = function (io) {
    var winston = require('winston');
    var Promise = require('bluebird');
    var request = require('requestretry');
    var config = require('../config.js');
    var mongoose = require('../lib/mongoose.js');
    var station = require('../controllers/stationController.js');
    var Schema = mongoose.Schema;

    var Device = new Schema({
        item_number: {
            type: String
        },
        type: {
            type: String
        },
        sku: {
            type: String
        },
        manufacturer: {
            type: String
        },
        model: {
            type: String
        },
        serial_number: {
            type: String
        }
    }, {
        usePushEach: true
    });

    var Log = new Schema({
        timestamp: {
            type: Date,
            required: true
        },
        level: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        details: {
            type: String,
            required: false
        }
    }, {
        usePushEach: true
    });

    var Tmp = new Schema({
        adbSerial: {
            type: String,
            required: false
        },
        currentStep: {
            type: String,
            required: false
        },
        autoTestsTotal: {
            type: Number,
            required: false
        },
        autoTestsComplete: {
            type: Number,
            required: false
        },
        manualTestsTotal: {
            type: Number,
            required: false
        },
        manualTestsComplete: {
            type: Number,
            required: false
        }
    }, {
        usePushEach: true
    });

    var SessionSchema = new Schema({
        start_time: {
            type: Date,
            required: true,
            unique: true
        },
        end_time: {
            type: Date,
            required: false,
            default: null
        },
        status: {
            type: String,
            required: false,
            default: 'Incomplete'
        },
        diagnose_only: {
            type: Boolean,
            required: true,
            default: false
        },
        device: {
            type: Device,
            required: true
        },
        logs: {
            type: [Log],
            required: false,
            default: []
        },
        is_sent: {
            type: Boolean,
            required: false,
            default: false
        },
        failed_tests: {
            type: [String],
            required: false
        },
        tmp: {
            type: Tmp,
            required: false
        }
    }, {
        usePushEach: true
    });

    SessionSchema.post('save', function (doc) {
        var session = doc.toObject();
        //winston.info('Session ' + session._id + ' saved.', JSON.stringify(session));
        io.emit('session-updated', session);
    });

    SessionSchema.pre('findOneAndUpdate', function () {
        //Set 'new' option to true so the post hook gets the updated session.
        this.findOneAndUpdate({}, {}, {new: true});
    });

    SessionSchema.post('findOneAndUpdate', function (doc) {
        var session = doc.toObject();
        //winston.info('Session ' + session._id + ' updated.', JSON.stringify(session));
        io.emit('session-updated', session);
    });

    SessionSchema.methods.start = Promise.method(function (device, tmp) {
        winston.info('Session ' + this._id + ' started for device ' + JSON.stringify(device));
        this.start_time = new Date();
        this.device = device;
        this.tmp = tmp;
        return this.save();
    });

    SessionSchema.methods.log = function (level, message, details) {
        this.logs.push({
            'timestamp': new Date(),
            'level': level,
            'message': message,
            'details': details
        })
    };

    SessionSchema.methods.finish = Promise.method(function (success, diagnose_only, reason) {
        this.end_time = new Date();
        if (success) {
            this.logs.push({
                'timestamp': new Date(),
                'level': 'Info',
                'message': 'Refresh completed successfully.',
                'details': ''
            });
            this.status = 'Success';
        } else {
            this.logs.push({
                'timestamp': new Date(),
                'level': 'Info',
                'message': 'Refresh failed.',
                'details': ''
            });
            this.status = 'Fail';
        }
        if (diagnose_only) {
            this.diagnose_only = true;
        }
        if (this.tmp === undefined) {
            this.tmp = {};
        }
        if (reason) {
            this.tmp.currentStep = 'finish' + reason;
        } else {
            this.tmp.currentStep = 'finish' + this.status;
        }
        return this.save().then(function(session) {
            sendSession(session);
        });
    });

    function sendSession(session) {
        var sessionData = session.toObject();
        if (sessionData.device.item_number) {
            var stationName = station.getName();
            return station.getServiceTag().then(function (stationServiceTag) {
                sessionData.station = {
                    'name': stationName,
                    'service_tag': stationServiceTag
                };
                delete sessionData._id;
                delete sessionData.tmp;
                winston.info('Sending session ' + session._id + ' for device: ' + sessionData.device.item_number);
                return request({
                    method: 'POST',
                    url: 'https://' + config.apiHost + '/session',
                    headers: {
                        'Authorization': config.apiAuthorization
                    },
                    body: sessionData,
                    rejectUnauthorized: false,
                    json: true
                }).then(function () {
                    // update status is sent
                    session.is_sent = true;
                    winston.info('Session ' + session._id + ' was sent.');
                    session.save().catch(function (err) {
                        winston.error('Error saving is_sent for session ' + session._id, err);
                    });
                }).catch(function (err) {
                    winston.error('Unable to send session ' + session._id, err);
                });
            });
        } else {
            winston.info('Session ' + session._id + ' is for an unidentified device and was not sent.');
            return Promise.resolve();
        }
    }

    SessionSchema.statics.sendUnsentSessions = Promise.method(function () {
        return this.find({is_sent: false}).then(function (sessions) {
            var promises = [];
            sessions.forEach(function (session) {
                promises.push(sendSession(session));
            });
            return Promise.all(promises);
        }).catch(function(err) {
            winston.error('Failed to send unsent sessions', err);
        });
    });

    if (mongoose.models.Session) {
        return mongoose.model('Session');
    } else {
        var Session = mongoose.model('Session', SessionSchema);

        //check for unsent sessions every hour
        setInterval(function() {
            Session.sendUnsentSessions();
        }, 3600000);

        return Session;
    }
};
