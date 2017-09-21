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
    return this._usbDrives;
};
UsbCache.prototype.updateProgress = function(progress, device){
    for (var key in this._usbDrives) {
        if (this._usbDrives.hasOwnProperty(key)) {
            if (key === device){
                this._usbDrives[key].status = 'in_progress';
                this._usbDrives[key].progress = progress;
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
UsbCache.prototype.getLowestUsbProgress = function(){
    var obj = this._usbDrives;
    if (!isEmptyObject(obj)) {
        // convert object to array to use reduce method;
        var arr = Object.keys(obj).map(function (key) { return obj[key]; });
        // getting all usb drives which are in progress
        var sessionsInProgress = arr.filter(function(obj) {
            return obj.status === 'in_progress';
        });
        // searching for min in all usb in progress;
        if (sessionsInProgress.length > 0 ){
            var min = sessionsInProgress.reduce(function(prev, current) {
                return (prev.progress < current.progress) ? prev : current;
            });//returns object with min progress;
        } else {
            return {error: 'No ubs drives in progress'};
        }
        return min;
    }
    return {error: 'No usb drives were added to refresh station'};
};
function isEmptyObject(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}
module.exports = new UsbCache();
