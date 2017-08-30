'use strict';
var usb = require('usb');
var request = require('request');
var express = require('express');
var fs = require('fs');
const drivelist = require('drivelist');


exports.usbBridge = usbBridge;
function usbBridge() {
    console.log('USB bridge started');

    usb.on('attach', function(device) {
        console.log('USB device was added');
        console.log(device);
        //console.log(device.deviceDescriptor.idProduct);
       // var data = {usb: device.deviceDescriptor.idProduct, item:'1502553231'};
       //  request.post(
       //      'http://localhost:3000/prepareUsb',
       //      { json: {usb: device.deviceDescriptor.idProduct, item:'1502553231'}},
       //      function (error, response, body) {
       //          if (!error && response.statusCode == 200) {
       //              console.log(body)
       //          } else {
       //              console.log(error);
       //          }
       //      }
       //  );
        drivelist.list(function(error, drives) {
            if (error) {
                throw error;
            }
            drives.forEach(function(drive) {
                console.log(drive);
        });
        });
    });
    usb.on('detach', function(device) {
        console.log('USB device was removed');
    });
    //{usb: vm.selectedDevice, item: vm.item}
}
