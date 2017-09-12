'use strict';

function SessionCache() {
    this._sessions = {};
}

Object.setPrototypeOf(SessionCache.prototype, Object.prototype);

SessionCache.prototype.set = function(key, session) {
    this._sessions[key] = session;
};

SessionCache.prototype.getFiltered = function(filter) {
    var filteredSessions = {};
    //console.log(this._sessions);
    for (var key in this._sessions) {
        if (filter.device_type && filter.device_type === this._sessions[key].device.type) {
            filteredSessions[key] = this._sessions[key];
        }
    }
    return filteredSessions;
};
SessionCache.prototype.getAllSessions = function(){
    return this._sessions;
};
SessionCache.prototype.get = function(key) {
    return this._sessions[key];
};

SessionCache.prototype.delete = function(key) {
    delete this._sessions[key];
};
SessionCache.prototype.checkSessionInProgress = function(item) {
    console.log('Checking if there is session in progress for device ' + item.InventoryNumber);
    for (var key in this._sessions) {
        if (this._sessions.hasOwnProperty(key)) {
            if (this._sessions[key].status === 'Incomplete') {
                if (this._sessions[key].device.item_number === item.InventoryNumber) {
                    console.log('Found incomplete session for item:' + item.InventoryNumber);
                    return {'started': true, 'session_id': key};
                }
            }
        }
    }
    return {'started': false};
};
SessionCache.prototype.checkSessionByStartDate = function(startTime) {
    console.log('Checking if there is session with such starting date: ' + startTime);
    for (var key in this._sessions) {
        if (this._sessions.hasOwnProperty(key)) {
            if (this._sessions[key].start_time.toISOString() === startTime) {
                console.log('Found session with start date:' + startTime);
                return {'has_session': true, 'session_id': key};
            } else {
                console.log('Did not found session with start date:' + startTime);
            }
        }

    }
    return {'has_session': false};
};
SessionCache.prototype.getSessionInProgressByDevice = function(item) {
    console.log('Checking if there is session in progress for device ' + item.adbSerial);
    for (var key in this._sessions) {
        if (this._sessions.hasOwnProperty(key)) {
            if (this._sessions[key].status === 'Incomplete' || this._sessions[key].status === 'Device Unrecognized') {
                if (this._sessions[key].device.adb_serial === item.adbSerial) {
                    console.log('Session found for serial:' + item.adbSerial);
                    return {'started': true, 'session_id': key};
                } else {
                    console.log('Session not found for serial:' + item.adbSerial);
                }
            }
        }
    }
    return {'started': false};
};
SessionCache.prototype.getAllSessionsByDevice = function(serial) {
    var filteredSessions = {};
    var sessions = [];
    for (var key in this._sessions) {
        if (serial === this._sessions[key].device.serial_number) {
            console.log('Session found for serial:' + serial);
            sessions.push(key);
        }
    }
    if (sessions.length === 0) {
        console.log('No sessions found for serial:' + serial);
    }
    filteredSessions['sessions'] = sessions;
    return filteredSessions;
};
module.exports = new SessionCache();
