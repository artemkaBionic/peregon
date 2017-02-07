/**
 * Created by larry on 3/3/2016.
 */

var config = require('./config');
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
const Promise = require("bluebird");
var request = require("request");
var os = require('os');
var exec = require('child_process').exec;
var service_tag = null;

const sessions = require('./sessionCache');



const MONGO_DB_URL = 'mongodb://localhost/AppChord?connectTimeoutMS=30000';
const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost + '/api/inventorylookup/';
const API_URL ='https://api2.basechord.com';
const API_RETRIES = 3;
const API_RETRY_DELAY = 1000;




var isDevelopment = process.env.NODE_ENV === 'development';
var sessionTypes = {};
var result = null;

exports.sessionStart = sessionStart;
exports.sessionUpdate = sessionUpdate;
exports.sessionFinish = sessionFinish;
exports.resendSession = resendSession;

exports.getItem = getItem;
exports.lockAndroid = lockAndroid;
exports.unlockAndroid = unlockAndroid;


function getItem(id, callback) {
    request({
        url: INVENTORY_LOOKUP_URL + id,
        headers: {
            'Authorization': config.apiAuthorization
        },
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
        if (error) {
            console.error(error);
            callback({error: error, item: null});
        }
        else {
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, item: body});
        }
    });
};

function lockAndroid(imei, callback) {
    request({
        method: 'POST',
        url: API_URL + '/unlockapi/lock',
        headers: {
            'Authorization': config.api2Authorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
        if (error) {
            console.error(error);
            callback({error: error, result: null});
        }
        else {
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, result: body});
        }
    });
    console.log('Lock request has been sent');
};

function unlockAndroid(imei, callback) {
    request({
        method: 'POST',
        url: API_URL + '/unlockapi/unlock',
        headers: {
            'Authorization': config.api2Authorization
        },
        body: {'IMEI': imei},
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
        if (error) {
            console.error(error);
            callback({error: error, result: null});
        }
        else {
            console.log('Server returned: ');
            console.log(body);
            callback({error: null, result: body});
        }
    });
    console.log('Unlock request has been sent');
};

function sessionStart(type, item, callback) {
    sessionTypes[item.InventoryNumber] = type;
    initSession(item);
    callback();
};

function sessionUpdate(itemNumber, message, callback) {
  //  console.log(itemNumber);
   // console.log(message);
    let session = sessions.get(itemNumber);
    console.log(session);
    logSession(session, "Started", message);
    callback();
};

function sessionFinish(itemNumber, details, callback) {

    let session = sessions.get(itemNumber);

    console.log('A client requested to finish an ' + sessionTypes[itemNumber] + ' refresh of item number ' + itemNumber);
    if (sessionTypes[itemNumber] === 'xbox-one') {
        if (isDevelopment) {
            console.log('Simulating verifying a refresh in a development environment by waiting 3 seconds.');
            setTimeout(function() {
                callback({success: true, device: details.device});
            }, 3000);
        } else {
            logSession(session, "Started", 'Checking ' + details.device.id + ' for evidence that the refresh completed successfully.');
            var mountSource = '/dev/' + details.device.id + '1';
            var mountTarget = '/mnt/' + details.device.id + '1';
            fs.mkdir(mountTarget, function(err) {
                if (err && err.code !== 'EEXIST') {
                    logSession(session, "Started", 'Error creating directory ' + mountTarget);
                    logSession(session, "Started", err);
                } else {
                    logSession(session, "Started", 'Attempting to mount ' + mountSource + ' to ' + mountTarget);
                    var mount = childProcess.spawn('mount', [mountSource, mountTarget]);
                    mount.on('close', function (code) {
                        var systemUpdateDir = path.join(mountTarget, '$SystemUpdate');
                        if (code !== 0) {
                            logSession(session, "Started", 'Error, failed to mount ' + mountSource + ' to ' + mountTarget);
                            logSession(session, "Started", 'mount command failed with error code ' + code);
                        } else {
                            logSession(session, "Started", 'Successfully mounted ' + mountSource + ' to ' + mountTarget);
                            var success = filesExist(systemUpdateDir, ['smcerr.log', 'update.cfg', 'update.log', 'update2.cfg']);
                            rimraf(path.join(mountTarget, '*'), function(err) {
                                childProcess.spawn('umount', [mountTarget]);
                                if (success) {
                                    logSession(session, "Completed", 'Refresh completed successfully.');
                                    session.SessionState = session.CurrentState = 'Completed';
                                    var uploaded = closeSession(session);
                                    callback({success: true, uploaded: uploaded });
                                } else {
                                    logSession(session, "VerifyRefreshFailed", 'Refresh failed.');
                                    session.CurrentState = 'VerifyRefreshFailed';
                                    session.SessionState = 'Aborted';
                                     var uploaded = closeSession(session);
                                    callback({success: false, uploaded: uploaded });
                                }
                            });
                        }
                    });
                }
            });
        }
    } else {
        if (details.complete) {
           // console.log(session);
            logSession(session, "Completed", 'Refresh completed successfully.');
            session.SessionState = session.CurrentState = 'Completed';
            var uploaded = closeSession(session);
            callback({success: true, uploaded: uploaded });
        } else {
           // console.log(session);
            logSession(session, "VerifyRefreshFailed", 'Refresh failed.');
            session.CurrentState = 'VerifyRefreshFailed';
            session.SessionState = 'Aborted';
            var uploaded = closeSession(session);
            callback({success: false, uploaded: uploaded });
        }
    }
};

function resendSession(itemNumber, callback) {
        let session = sessions.get(itemNumber);
        var uploaded = sendSession(session);
        callback({success: session.SessionState = 'Completed', uploaded: uploaded });
}

//Get Station ServiceTAG
function getServiceTag() {
    var cmd = 'dmidecode -s system-serial-number';
    exec(cmd, function(error, stdout, stderr) {
        if (error) {
            console.log(error);
        }
        if (!error) {                      
            SERVICE_TAG = stdout;
        }
});
}


function initSession(device, diagnose_only=false) {        
    session_device = {
        
    } 
    let newSession = {
        "start_time" : new Date(),
        "end_time": null,
        "status": 'Incomplete',
        "diagnose_only": diagnose_only,
        "device": device, 
        "station": {
            "name": os.hostname(),
            "service_tag": SERVICE_TAG
        },
        "logs": []
    };

    sessions.set(device.InventoryNumber, newSession);
   // console.log(sessions); 
}


function logSession(session, processState, message) {
    console.log(session);
    logDate = new Date();

    logEntry = {};
    logEntry.Importance = "Info";
    logEntry.TimeStamp = logDate;
    logEntry.LogTimeStamp = logDate;
    logEntry.Details = null;
    logEntry.ProcessState = processState;
    logEntry.Message = message;

    session.LastUpdated = new Date();
    session.logs.push(logEntry);
}

function closeSession(itemNumber) {
    
    console.log("closing session");
    let session = sessions.get(itemNumber);
    session.end_time = new Date(); 
    
    sendSession(session, 0)
        .then(function (body) {
            if (body)

            console.log(body);
        })
        .catch(function (e) { console.log(e); }); 
}

function sendSession(session, attempt) {
    console.log("Start sending");
    
    return new Promise((resolve,reject) => {
       // console.log(realtime_session);
        request({
            method: 'POST',
            url: API_URL + '/session',
            headers: {
                'Authorization': config.api3Authorization
            },
            body: session,
            rejectUnauthorized: false,
            json: true
        }, (error, response, body) => {
            if (error || (response.statusCode !== 200 && body === undefined)) {
                if (attept < API_RETRIES) {
                    return sendSession(session, attempt++);
                } else {
                    return reject(error);
                }
            }
            else {
                resolve(body);
            }
        })
    });

}

function filesExist(directory, files) {
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
}

