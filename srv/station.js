var fs = require('fs');
var os = require('os');
var childProcess = require('child_process');
var exec = require('child_process').exec;

var isDevelopment = process.env.NODE_ENV === 'development';
var connectionState = null;
var service_tag = null;
var name = null;


exports.getServiceTag = function(callback) {
    if (service_tag === null) {
        if (isDevelopment) {
            service_tag = '2UA3340ZS6'; // Lab Station
            callback(service_tag);
        } else {
            exec('dmidecode -s system-serial-number', function(error, stdout, stderr) {
                if (error) {
                    console.log(error);
                    console.log(stderr);
                } else {
                    service_tag = stdout.substr(0, stdout.indexOf("\n")); // First line
                }
                callback(service_tag);
            });
        }
    } else {
        callback(service_tag);
    }
};

exports.getName = function() {
    if (name === null) {
        if (isDevelopment) {
            name = 'station7446a09dac51'; // Lab Station
        } else {
            name = os.hostname();
        }
    }
    return name;
};

exports.setConnectionState = function(state) {
    connectionState = state;
};

exports.getConnectionState = function() {
    return connectionState;
};

exports.getIsServiceCenter = function(callback) {
    if (isDevelopment) {
        console.log('Simulating service center check in a Windows development environment.');
        callback(false);
    } else {
        fs.stat('/srv/packages/ServiceCenter.mode', function(err, stat) {
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

exports.getPackage = function(sku, callback) {
    var package = {
        isDownloaded: null
    };
    if (isDevelopment) {
        console.log('Simulating package download check in a Windows development environment.');
        package.isDownloaded = true;
        callback(package);
    } else {
        fs.stat('/srv/packages/' + sku + '/.complete', function(err, stat) {
            if (err == null) {
                console.log('Package for sku ' + sku + ' is downloaded.');
                package.isDownloaded = true;
            } else if (err.code == 'ENOENT') {
                console.log('Package for sku ' + sku + ' is NOT downloaded.');
                package.isDownloaded = false;
            } else {
                console.log('Error while checking if /srv/packages/' + sku + '/.complete exists: ', err.code);
            }
            callback(package);
        });
    }
};

exports.reboot = function() {
    console.log('Reboot requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--reboot']);
    }
};

exports.shutdown = function() {
    console.log('Shutdown requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--poweroff']);
    }
};

