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
    for (var key in this._sessions) {
        if (filter.device_type && filter.device_type === this._sessions[key].device.type) {
            filteredSessions[key] = this._sessions[key];
        }
    }
    return filteredSessions;
};

SessionCache.prototype.get = function(key) {
    return this._sessions[key];
};

SessionCache.prototype.delete = function(key) {
    delete this._sessions[key];
};

module.exports = new SessionCache();
