var config = require('./config');
var fs = require('fs');
var os = require('os');
var childProcess = require('child_process');
var shell = require('shelljs');

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
            shell.exec('dmidecode -s system-serial-number', function(code, stdout, stderr) {
                if (code !== 0) {
                    console.error(stderr);
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

exports.getUsbDrives = function(callback) {
    var devices = [];
    fs.readdir('/sys/block/', function(err, files) {
        if (err) {
            callback(err, null);
        } else {
            files.filter(function(file) {
                return file.match(config.usbDeviceIdRegEx);
            });
            var promises = files.map(function(file) {
                return new Promise(function(resolve, reject) {
                    exports.getUsbDrive(file, function(err, device) {
                        if (device !== null) {
                            devices.push(device);
                        }
                        resolve();
                    });
                });
            });
            Promise.all(promises).then(function() {
                callback(null, devices);
            });
        }
    });
};

exports.getUsbDrive = function(id, callback) {
    console.log('Getting USB drive information for ' + id);
    shell.exec('udevadm info --query=property --path=/sys/block/' + id, {silent: true}, function(code, stdout, stderr) {
        if (code !== 0) {
            callback(stderr, null);
        } else {
            var deviceInfo = stdout.trim().split(os.EOL);
            var device = {
                id: id,
                type: null
            };
            deviceInfo.forEach(function(element) {
                if (element === 'ID_BUS=usb') {
                    device.type = 'USB';
                }
            });
            if (device.type === null) {
                callback(null, null);
            } else {
                shell.exec('blockdev --getsize64 /dev/' + id, function(code, stdout, stderr) {
                    if (code !== 0) {
                        callback(stderr, null);
                    } else {
                        device.size = stdout;
                        callback(null, device);
                    }
                });
            }
        }
    });
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

