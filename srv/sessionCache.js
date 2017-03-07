'use strict';

function SessionCache() {
    this._sessions = {};
}

Object.setPrototypeOf(SessionCache.prototype, Object.prototype);

SessionCache.prototype.set = function(key, session) {
    this._sessions[key] = session;
};

SessionCache.prototype.get = function(key) {
    return this._sessions[key];
};

module.exports = new SessionCache();