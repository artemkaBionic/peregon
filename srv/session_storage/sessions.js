var Db = require('tingodb')().Db,
    assert = require('assert');
var db = new Db('.', {});
var sessions = db.collection("sessions");
var Promise = require('bluebird');
Promise.config({
    warnings: false
});
exports.getAllSessions = getAllSessions;
exports.set = set;
exports.get = get;
exports.deleteSession = deleteSession;
exports.checkSessionInProgress = checkSessionInProgress;
exports.checkSessionByStartDate = checkSessionByStartDate;
exports.getSessionInProgressByDevice = getSessionInProgressByDevice;
exports.pushLogs = pushLogs;
exports.updateSession = updateSession;
exports.findSessionByParams = findSessionByParams;
exports.sessionUpdateItem = sessionUpdateItem;
function set(sessionId, session){
    console.log('Adding session with id:' + sessionId + ' to Tingo session storage');
    sessions.insert(session, function(err) {
        assert.equal(null, err);
    });
}

function getAllSessions(){
    return new Promise(function(resolve, reject) {
        sessions.find({}).toArray(function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
function deleteSession(sessionId){

}
function get(sessionId){
    console.log('getting session');
    sessions.findOne({'_id':sessionId}, function(err, item) {
        return item;
    })
}
function checkSessionInProgress(item) {
    console.log('Checking if there is session in progress for device ' + item.InventoryNumber);
    sessions.findOne({'device.item_number':item.InventoryNumber,'status': 'Incomplete'}, function(err, item) {
        console.log(item);
    })
}

function checkSessionByStartDate(startTime) {
    console.log('Checking in Tingo if there is session with such starting date: ' + startTime);
    return new Promise(function(resolve, reject) {
        sessions.findOne({'start_time': startTime}, function(err, item) {
            if (err) {
                reject(err);
            } else if (item.start_time) {
                resolve(item);
            } else {
                reject('error');
            }
        });
    });
}
function findSessionByParams(params) {
    console.log('Finding session by params');
    return new Promise(function(resolve, reject) {
        sessions.findOne(params, function(err, item) {
            if (err) {
                reject(err);
            } else  {
                resolve(item);
            }
        })
    });
}
function getSessionInProgressByDevice(item) {
    console.log('Checking if there is session with such starting date: ' + startTime);
    sessions.findOne({'adb_serial': item.adbSerial}, function(err, item) {
        console.log(item);
    })
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
function updateSession(session) {
    console.log('Updating in Tingo this session:' + session._id);
    sessions.update({_id: session._id}, session, {upsert: true, setDefaultsOnInsert: true},
        function (err) {
            if (err) {
                console.log('Can not update session' + session._id + 'in tingo because of' + err);
            }
        });
}
function sessionUpdateItem(serialNumber, item) {
    console.log('Updating all sessons in Tingo this serial:' + serialNumber);
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
                    resolve(err);
                } else {
                    resolve(result);
                }
            });

    });

    // .update(
    //     {_id: session._id},
    //     session
    // )
}

