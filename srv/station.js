var fs = require('fs');

var station = module.exports = {
    connectionState: null,
    setConnectionState: function(state) {
        this.connectionState = state;
    },
    getConnectionState: function() {
        return this.connectionState;
    },
    getIsServiceCenter: function(callback) {
        if (process.platform === 'win32') {
            console.log('Simulating service center check in a Windows development environment.');
            callback(false);
        } else {
            fs.stat('/srv/packages/ServiceCenter.mode', function (err, stat) {
                if (err == null) {
                    console.log('isServiceCenter = true');
                    callback(true);
                } else if (err.code == 'ENOENT') {
                    console.log('isServiceCenter = false');
                    callback(false);
                } else {
                    console.log('Error while checking if /srv/packages/ServiceCenter.mode exists: ', err.code);
                    callback(null);
                }
            });
        }
    }
};
