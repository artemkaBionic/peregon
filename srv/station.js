var fs = require('fs');
var os = require('os');
var childProcess = require('child_process');
var exec = require('child_process').exec;

var isDevelopment = process.env.NODE_ENV === 'development';
var connectionState = null;
var service_tag = getServiceTag();
var name = getName();


exports.service_tag = service_tag;
exports.name = name;

exports.setConnectionState = function (state) {
    connectionState = state;
};

exports.getConnectionState = function () {
    return connectionState;
};

exports.getIsServiceCenter = function (callback) {
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
};

exports.reboot = function () {
    console.log('Reboot requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--reboot']);
    }
};

exports.shutdown = function () {
    console.log('Shutdown requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--poweroff']);
    }
};

function getServiceTag() {
    if (isDevelopment) {
        service_tag = '2UA3340ZS6'; // Lab Station
    } else {
        exec('dmidecode -s system-serial-number', function (error, stdout, stderr) {
            if (error) {
                console.log(error);
            }
            if (!error) {
                service_tag = stdout;
            }
        });
    }
}

function getName() {
    if (isDevelopment) {
        name = 'station7446a09dac51'; // Lab Station
    } else {
        name = os.hostname();
    }
}


