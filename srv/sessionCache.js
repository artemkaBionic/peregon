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
                    console.log('Session incomplete for item:' + item.InventoryNumber);
                    // console.log(this._sessions[key]);
                    return {'started': true, 'session_id': key};
                }
            }
        }
    }
    return {'started': false};
};
SessionCache.prototype.checkSessionByDevice = function(item) {
    console.log('Checking if there is session in progress for device ' + item.InventoryNumber);
    for (var key in this._sessions) {
        if (this._sessions.hasOwnProperty(key)) {
            console.log(this._sessions[key].status);
            console.log(this._sessions[key].device.adb_serial);
            console.log(item);
            if (this._sessions[key].status === 'Incomplete' || this._sessions[key].status === 'Device Unauthorized') {
               if (this._sessions[key].device.adb_serial === item.adbSerial) {
                    console.log('Session incomplete');
                    // console.log(this._sessions[key]);
                    return {'started': true, 'session_id': key};
               }
            }
        }
    }
    return {'started': false};
};
module.exports = new SessionCache();
