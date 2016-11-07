var fs = require('fs');
var childProcess = require('child_process');
var isDevelopment = process.env.NODE_ENV === 'development';

var station = module.exports = {
    connectionState: null,
    setConnectionState: function(state) {
        this.connectionState = state;
    },
    getConnectionState: function() {
        return this.connectionState;
    },
    getIsServiceCenter: function(callback) {
        if (isDevelopment) {
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
    },
    reboot: function() {
        console.log('Reboot requested.');
        if (!isDevelopment) {
            childProcess.spawn('python', ['/opt/powercontrol.py', '--reboot']);
        }
    },
    shutdown: function() {
        console.log('Shutdown requested.');
        if (!isDevelopment) {
            childProcess.spawn('python', ['/opt/powercontrol.py', '--poweroff']);
        }
    }
};
