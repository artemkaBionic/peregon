/*jslint node: true */
'use strict';
var config = require('../config.js');
var fs = require('fs');
var os = require('os');
var childProcess = require('child_process');
var shell = require('shelljs');

var isDevelopment = process.env.NODE_ENV === 'development';
var connectionState = null;
var service_tag = null;
var name = null;
var winston = require('winston');

exports.getServiceTag = function() {
    return new Promise(function(resolve, reject) {
        if (service_tag === null) {
            if (isDevelopment) {
                service_tag = '2UA3340ZS6'; // Lab Station
                resolve(service_tag);
            } else {
                shell.exec('dmidecode -s system-serial-number',
                    function(code, stdout, stderr) {
                        if (code !== 0) {
                            winston.error('Error reported from dmidecode', stderr);
                            reject(new Error(stderr));
                        } else {
                            service_tag = stdout.substr(0, stdout.indexOf('\n')); // First line
                            resolve(service_tag);
                        }
                    });
            }
        } else {
            resolve(service_tag);
        }
    });
};

exports.getName = function() {
    if (name === null) {
        name = os.hostname();
    }
    return name;
};

exports.getUsbDrives = function() {
    return new Promise(function(resolve, reject) {
        var devices = [];
        fs.readdir('/sys/block/', function(err, files) {
            if (err) {
                reject(err);
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
                    resolve(devices);
                });
            }
        });
    });
};

exports.getUsbDrive = function(id) {
    return new Promise(function(resolve, reject) {
        winston.info('Getting USB drive information for ' + id);
        shell.exec('udevadm info --query=property --path=/sys/block/' + id,
            {silent: true}, function(code, stdout, stderr) {
                if (code !== 0) {
                    reject(new Error(stderr));
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
                        resolve(null);
                    } else {
                        shell.exec('blockdev --getsize64 /dev/' + id,
                            function(code, stdout, stderr) {
                                if (code !== 0) {
                                    reject(new Error(stderr));
                                } else {
                                    device.size = stdout;
                                    resolve(device);
                                }
                            });
                    }
                }
            });
    });
};

exports.getConnectionState = function() {
    return new Promise(function(resolve, reject) {
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
                resolve(connectionState);
            });
        } else {
            resolve(connectionState);
        }
    });
};

exports.getIsServiceCenter = function() {
    return new Promise(function(resolve, reject) {
        if (isDevelopment) {
            winston.info('Simulating service center check in a Windows development environment.');
            resolve(true);
        } else {
            fs.stat('/srv/packages/ServiceCenter.mode', function(err, stat) {
                if (err === null) {
                    winston.info('isServiceCenter = true');
                    resolve(true);
                } else if (err.code === 'ENOENT') {
                    winston.info('isServiceCenter = false');
                    resolve(false);
                } else {
                    winston.error('Error while checking if /srv/packages/ServiceCenter.mode exists', err);
                    reject(err);
                }
            });
        }
    });
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

