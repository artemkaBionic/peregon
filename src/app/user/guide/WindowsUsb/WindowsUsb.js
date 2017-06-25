(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerWindowsUsb', GuideControllerWindowsUsb);

    GuideControllerWindowsUsb.$inject = ['toastr', '$timeout', '$http', '$q', 'item', 'config', 'socketService', 'eventService', 'inventoryService', '$state', 'deviceService'];

    function GuideControllerWindowsUsb(toastr, $timeout, $http, $q, item, config, socketService, eventService, inventoryService, $state, deviceService) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.selectedDevice = null;
        vm.step = null;
        vm.ready = false;
        vm.success = false;
        vm.finished = false;
        vm.percentageComplete = 0;
        vm.PowerGood = false;
        vm.ExternalGood = false;
        vm.ButtonsGood = false;
        var usbDeviceMinSize = 30000000000;
        vm.steps = {
            prepare: {
                name: 'prepareUSBdrive',
                number: 1,
                title: 'Prepare USB drive'
            },
            refresh: {
                name: 'refreshLaptop',
                number: 2,
                title: 'Refresh Laptop'
            },
            finish: {
                name: 'checkStatus',
                number: 3,
                title: 'Check status.'
            }
        };
        vm.substeps = {
            checkCondition: {
                name: 'checkCondition',
                number: 0,
                title: 'Check Condition'
            },
            insertUsbToStation: {
                name: 'insertUsbToStation',
                number: 1,
                title: 'Insert USB To Station'
            },
            usbLoading: {
                name: 'usbLoading',
                number: 2,
                title: 'Insert USB To Station'
            },
            usbFailed: {
                name: 'usbFailed',
                number: 3,
                title: 'USB Failed'
            },
            refreshSuccess: {
                name: 'refreshSuccess',
                number: 4,
                title: 'Refresh Success'
            },
            rerfeshFailed: {
                name: 'rerfeshFailed',
                number: 5,
                title: 'Refresh Failed'
            },
            deviceBroken: {
                name: 'deviceBroken',
                number: 6,
                title: 'Device Broken'
            },
            usbLoadFailed: {
                name: 'usbLoadFailed',
                number: 7,
                title: 'USB Load Failed'
            }
        };
        // vm.addUSB = function() {
        //     var url = 'http://localhost:3000/event/device-add';
        //     var headers = {'content-type': 'application/json'};
        //
        //     $http({
        //         url: url,
        //         method: 'POST',
        //         headers: headers,
        //         data: {'id':'sdc', 'type': 'USB', 'manufacturer':'Generic', 'serial':'C5168175', 'size':'4444444444444444'}
        //     }).then(function(response){
        //         //success
        //     },function(resonse){
        //         //error
        //     })
        // };
        // vm.removeUsb = function() {
        //     var url = 'http://localhost:3000/event/device-remove';
        //     var headers = {'content-type': 'application/json'};
        //     $http({
        //         url: url,
        //         method: 'POST',
        //         headers: headers,
        //         data: {'id':'sdc', 'type': 'USB', 'manufacturer':'Generic', 'serial':'C5168175', 'size':'44444444444444444'}
        //     }).then(function(response){
        //         //success
        //     });
        // };
        vm.step = vm.steps.prepare;
        activate();
        vm.prepareRefreshUsbStart = function() {
            inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Device inspection complete.', 'Mac is in good condition.');
            if (vm.selectedDevice === null) {
                vm.step = vm.steps.prepare;
                vm.substep = vm.substeps.insertUsbToStation;
                waitForUsbAdd(prepareRefreshUsbApply);
            } else {
                prepareRefreshUsbApply({usb: vm.selectedDevice, item: vm.item});
            }
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        // vm.showGuide = function() {
        //     vm.step = vm.steps.refresh;
        // };
        function activate() {
            var queries = [
                inventoryService.startSession(item),
                loadDevices(),
                eventService.DisableDeviceNotification()
            ];
            $q.all(queries).then(function() {
                vm.checkCondition();
            });
        }
        function loadDevices() {
            return deviceService.getDevices().then(function(devices) {
                if (devices !== null) {
                    if (vm.selectedDevice === null && devices.length > 0) {
                        for (var i = devices.length - 1; i >= 0; --i) {
                            if (devices[i].size >= usbDeviceMinSize) {
                                vm.selectedDevice = devices[i];
                                break;
                            }
                        }
                    }
                }
            });
        }

        function deviceAdd(data) {
            if (vm.selectedDevice === null && data.size >= usbDeviceMinSize) {
                vm.selectedDevice = data;
            }
        }
        socketService.on('device-add', deviceAdd);

        function deviceRemove(data) {
            if (vm.selectedDevice !== null && vm.selectedDevice.id === data.id) {
                vm.selectedDevice = null;
            }
        }
        socketService.on('device-remove', deviceRemove);

        vm.checkCondition = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.checkCondition;
        };
        vm.finishFailed = function() {
            // inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session failed.')
            //     .then(inventoryService.finishSession(vm.item.InventoryNumber, {'complete': false}));
            $timeout(function() {
                vm.step = vm.steps.prepare;
                vm.substep = vm.substeps.deviceBroken;
            }, 500);
        };
        function usbProgress(data) {
            vm.percentageComplete = data.progress;
        }

        function prepareRefreshUsbApply(data) {
            vm.percentageComplete = 0;
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.usbLoading;
            $http({
                url: '/prepareUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: data
            });
            socketService.on('usb-progress', usbProgress);
            socketService.once('usb-complete', function(data) {
                socketService.off('usb-progress', usbProgress);
                if (data.err) {
                    vm.step = vm.steps.prepare;
                    vm.substep = vm.substeps.usbLoadFailed;
                } else {
                    vm.percentageComplete = 100;
                    $timeout(prepareRefreshUsbComplete, 500);
                }
            });
        }

        function waitForUsbAdd(minSize, callback) {
            if (vm.selectedDevice === null) {
                socketService.once('device-add', function(data) {
                    if (data.size >= minSize) {
                        vm.selectedDevice = data;
                        callback({usb: vm.selectedDevice, item: vm.item});
                        toastr.info('Follow further instructions on screen', 'USB Drive Connected', {
                            'tapToDismiss': true,
                            'timeOut': 3000,
                            'closeButton': true
                        });
                    } else {
                        waitForUsbAdd(minSize, callback);
                    }
                });
            } else {
                callback({usb: vm.selectedDevice, item: vm.item});
            }
        }

        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.refresh;
            waitForUsbRemove(windowsRefreshStart);
        }

        function windowsRefreshStart() {
            waitForUsbAdd(usbDeviceMinSize, verifyRefreshStart);
        }

        function verifyRefreshStart(data) {
            $http({
                url: '/readSession',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: data
            }).then(function(response) {
                if (response.status === 200) {
                    var refreshSuccess = response.data;
                    if (refreshSuccess) {
                        inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session complete.')
                            .then(inventoryService.finishSession(vm.item.InventoryNumber, {'complete': true}));
                        vm.step = vm.steps.finish;
                        vm.substep = vm.substeps.refreshSuccess;
                    } else {
                        inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session failed.')
                            .then(inventoryService.finishSession(vm.item.InventoryNumber, {'complete': false}));
                        vm.step = vm.steps.finish;
                        vm.substep = vm.substeps.rerfeshFailed;
                    }
                } else {
                    //ToDo: Report internal error
                    inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session failed.')
                        .then(inventoryService.finishSession(vm.item.InventoryNumber, {'complete': false}));
                    vm.step = vm.steps.finish;
                    vm.substep = vm.substeps.rerfeshFailed;
                }
            });
        }

        function waitForUsbRemove(callback) {
            socketService.once('device-remove', function(data) {
                if (data.id === vm.selectedDevice.id) {
                    vm.selectedDevice = null;
                    callback();
                    toastr.info('Follow further instructions on screen', 'USB Drive Removed', {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
                } else {
                    waitForUsbRemove(callback);
                }
            });
        }

        vm.retry = function() {
            inventoryService.startSession(item);
            vm.prepareRefreshUsbStart();
        };
    }
})();