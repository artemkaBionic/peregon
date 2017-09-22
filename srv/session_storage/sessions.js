var Db = require('tingodb')().Db,
    assert = require('assert');
var db = new Db('.', {});
var sessions = db.collection("sessions");
var Promise = require('bluebird');
Promise.config({
    warnings: false
});

exports.set = set;
exports.getSessionsByParams = getSessionsByParams;
exports.getSessionByParams = getSessionByParams;
exports.updateSession = updateSession;
exports.pushLogs = pushLogs;
exports.sessionUpdateItem = sessionUpdateItem;
function set(sessionId, session){
    console.log('Adding session with id:' + sessionId + ' to Tingo session storage');
    sessions.insert(session, function(err) {
        assert.equal(null, err);
    });
}

function getSessionsByParams(params){
    return new Promise(function(resolve, reject) {
        sessions.find(params).toArray(function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function getSessionByParams(params) {
    //console.log('Finding session by params');
    return new Promise(function(resolve, reject) {
        sessions.findOne(params, function(err, session) {
            if (err) {
                reject(err);
            } else if(!session.start_time){
                reject({message:'did not found session'});
            } else {
                resolve(session);
            }
        })
    });
}

function updateSession(session) {
    console.log('Updating in Tingo this session:' + session._id);
    sessions.update({_id: session._id}, session, {upsert: true, setDefaultsOnInsert: true},
        function (err) {
            if (err) {
                console.log('Can not update session' + session._id + 'in tingo because of' + err);
            }
        });
}

function pushLogs(sessionId, log){
    console.log('Pushing logs for session id:' + sessionId);
    sessions.update(
        { _id: sessionId },
        { $push: { logs: log } } , function(err){
            if (err) {
                console.log('Can not update logs for' + sessionId + 'in Tingo because of' + err);
            }
        }
    )
}

function sessionUpdateItem(serialNumber, item) {
    console.log('Updating all sessons in Tingo with this serial:' + serialNumber);
    return new Promise(function(resolve, reject) {
        sessions.update({'device.serial_number': serialNumber},
            {$set: {
                'device.sku': item.Sku,
                'device.item_number': item.InventoryNumber,
                'device.model': item.Model,
                'device.manufacturer': item.Manufacturer,
                'device.type': item.Type,
                'device.serial_number': item.Serial
            }}, { upsert: true, setDefaultsOnInsert: true, multi: true },
            function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });

    });
}

