/*jslint node: true */
'use strict';
var config = require('./config.js');
var fs = require('fs');
var os = require('os');
var childProcess = require('child_process');
var shell = require('shelljs');

var isDevelopment = process.env.NODE_ENV === 'development';
var connectionState = null;
var service_tag = null;
var name = null;
var winston = require('winston');

exports.getServiceTag = function(callback) {
    if (service_tag === null) {
        if (isDevelopment) {
            service_tag = '2UA3340ZS6'; // Lab Station
            callback(service_tag);
        } else {
            shell.exec('dmidecode -s system-serial-number',
                function(code, stdout, stderr) {
                    if (code !== 0) {
                        winston.error('Error reported from dmidecode: ' + stderr);
                    } else {
                        service_tag = stdout.substr(0, stdout.indexOf('\n')); // First line
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
        name = os.hostname();
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
    winston.info('Getting USB drive information for ' + id);
    shell.exec('udevadm info --query=property --path=/sys/block/' + id,
        {silent: true}, function(code, stdout, stderr) {
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
                    shell.exec('blockdev --getsize64 /dev/' + id,
                        function(code, stdout, stderr) {
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

exports.getConnectionState = function(callback) {
    if (connectionState === null) {
        fs.readFile(config.connectionStateFile, 'utf8', function(err, data) {
            if (err) {
                winston.error('Error reading connections state', err);
            } else {
                try {
                    connectionState = JSON.parse(data);
                } catch (err) {
                    winston.error('Error parsong contents of state file', err);
                }
            }
            callback(connectionState);
        });
    } else {
        callback(connectionState);
    }
};

exports.getIsServiceCenter = function(callback) {
    if (isDevelopment) {
        winston.info('Simulating service center check in a Windows development environment.');
        callback(true);
    } else {
        fs.stat('/srv/packages/ServiceCenter.mode', function(err, stat) {
            if (err === null) {
                winston.info('isServiceCenter = true');
                callback(true);
            } else if (err.code === 'ENOENT') {
                winston.info('isServiceCenter = false');
                callback(false);
            } else {
                winston.error('Error while checking if /srv/packages/ServiceCenter.mode exists: ', err);
                callback(null);
            }
        });
    }
};

exports.getPackage = function(sku, callback) {
    var pkg = {
        isDownloaded: null
    };
    if (isDevelopment) {
        winston.info('Simulating package download check in a Windows development environment.');
        pkg.isDownloaded = true;
        callback(pkg);
    } else {
        fs.stat('/srv/packages/' + sku + '/.complete', function(err, stat) {
            if (err === null) {
                winston.info('Package for sku ' + sku + ' is downloaded.');
                pkg.isDownloaded = true;
            } else if (err.code === 'ENOENT') {
                winston.info('Package for sku ' + sku + ' is NOT downloaded.');
                pkg.isDownloaded = false;
            } else {
                winston.error('Error while checking if /srv/packages/' + sku + '/.complete exists: ', err);
            }
            callback(pkg);
        });
    }
};

exports.reboot = function() {
    winston.info('Reboot requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--reboot']);
    }
};

exports.shutdown = function() {
    winston.info('Shutdown requested.');
    if (!isDevelopment) {
        childProcess.spawn('python', ['/opt/powercontrol.py', '--poweroff']);
    }
};

