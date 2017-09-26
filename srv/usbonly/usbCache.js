'use strict';

function UsbCache() {
    this._usbDrives = {};
}

Object.setPrototypeOf(UsbCache.prototype, Object.prototype);

UsbCache.prototype.set = function(key, session) {
    this._usbDrives[key] = session;
};

UsbCache.prototype.delete = function(key) {
    delete this._usbDrives[key];
};

UsbCache.prototype.getAllUsbDrives = function(){
    // return this._usbDrives;
    var usbDrives = this._usbDrives;
    usbDrives.usbData = {};
    usbDrives.usbData.numberOfDevices = 0;
    usbDrives.usbData.notReadyDevices = 0;
    usbDrives.usbData.inProgressDevices = 0;
    usbDrives.usbData.readyDevices = 0;
    for (var key in usbDrives) {
        if (usbDrives.hasOwnProperty(key)) {
            if(usbDrives[key].status){
                usbDrives.usbData.numberOfDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 && usbDrives[key].status === 'not_ready') {
                usbDrives.usbData.notReadyDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 && usbDrives[key].status === 'in_progress') {
                usbDrives.usbData.inProgressDevices++;
            }
            if (usbDrives.usbData.numberOfDevices !== 0 && usbDrives[key].status === 'ready') {
                usbDrives.usbData.readyDevices++;
            }
        }
    }
    // statuses for front-end
    if (usbDrives.usbData.notReadyDevices > 0) {
        usbDrives.usbData.status = 'newBootDevice';
    } else if (usbDrives.usbData.inProgressDevices > 0) {
        usbDrives.usbData.status = 'bootDevicesProcessing';
    }  else if (usbDrives.usbData.numberOfDevices === 0) {
        usbDrives.usbData.status = 'noBootDevices';
    } else {
        usbDrives.usbData.status = 'bootDevicesReady';
    }
    // text plural vs single for front-end
    if (usbDrives.usbData.notReadyDevices === 1) {
        usbDrives.usbData.bootableUsb = 'Bootable USB drive';
        usbDrives.usbData.usbDrive = 'USB drive';
        usbDrives.usbData.usbDrivesText = 'Now you can create your Bootable USB drive.';
        usbDrives.usbData.usbButtonText = 'Create Bootable USB drive';
        usbDrives.usbData.usbDrivesTitle = usbDrives.usbData.notReadyDevices + ' New USB drive is connected'
    } else {
        usbDrives.usbData.bootableUsb = 'Bootable USB drives';
        usbDrives.usbData.usbDrive = 'USB drives';
        usbDrives.usbData.usbText = 'Bootable USB drives';
        usbDrives.usbData.usbDrivesTitle = usbDrives.usbData.notReadyDevices + ' New USB drives are connected';
        usbDrives.usbData.usbDrivesText = 'Now you can create your Bootable USB drives.';
        usbDrives.usbData.usbButtonText = 'Create Bootable USB drives';
    }
    if (usbDrives.usbData.inProgressDevices === 1) {
        usbDrives.usbData.bootableUsb = 'Bootable USB drive';
        usbDrives.usbData.usbDrive = 'USB drive';
    } else {
        usbDrives.usbData.bootableUsb = 'Bootable USB drives';
        usbDrives.usbData.usbDrive = 'USB drives';
    }

    if (usbDrives.usbData.readyDevices === 1) {
        usbDrives.usbData.bootableUsb = 'Bootable USB drive';
        usbDrives.usbData.bootableUsbReadyText = 'Bootable USB drive is ready';
    } else {
        usbDrives.usbData.bootableUsb = 'Bootable USB drives';
        usbDrives.usbData.bootableUsbReadyText = 'Bootable USB drives are ready';
    }
    return usbDrives;
};

UsbCache.prototype.updateProgress = function(progress, device){
    for (var key in this._usbDrives) {
        if (this._usbDrives.hasOwnProperty(key)) {
            if (key === device){
                this._usbDrives[key].status = 'in_progress';
                this._usbDrives[key].progress = +progress;
            }
        }
    }
};
UsbCache.prototype.finishProgress = function(device){
    for (var key in this._usbDrives) {
        if (this._usbDrives.hasOwnProperty(key)) {
            if (key === device){
                this._usbDrives[key].status = 'ready';
                this._usbDrives[key].progress = 100;
            }
        }
    }
};
UsbCache.prototype.completeUsb = function(data){
    for (var key in this._usbDrives) {
        if (this._usbDrives.hasOwnProperty(key)) {
            if (!data.err) {
                if (key === data.device){
                    this._usbDrives[key].status = 'complete';
                    this._usbDrives[key].progress = 100;
                } else {
                    this._usbDrives[key].status = 'failed';
                    this._usbDrives[key].progress = 0;
                }
            }
        }
    }
};
UsbCache.prototype.getLowestUsbInProgress = function(){
    var obj = this._usbDrives;
    if (!isEmptyObject(obj)) {
        // convert object to array to use reduce method;
        var usbDrives = Object.keys(obj).map(function (key) { return obj[key]; });

        // getting all usb drives which are in progress
        var usbDrivesInProgress = usbDrives.filter(function(obj) {
            return obj.status === 'in_progress';
        });
        // searching for min in all usb in progress;
        if (usbDrivesInProgress.length > 0 ){
            var min = usbDrivesInProgress.reduce(function(prev, current) {
                return (prev.progress < current.progress) ? prev : current;
            });//returns object with min progress;
        } else {
            return {message: 'No ubs drives in progress'};
        }
        return min;
    }
    return {message: 'No usb drives were added to refresh station'};
};
function isEmptyObject(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}
module.exports = new UsbCache();

