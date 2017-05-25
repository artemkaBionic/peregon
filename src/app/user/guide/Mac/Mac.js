(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerMac', GuideControllerMac);

    GuideControllerMac.$inject = ['popupLauncher', 'toastr', '$timeout', '$http', '$scope', '$q', 'item', 'config','deviceService', 'packageService', 'socketService', 'eventService', 'inventoryService', '$state'];

    function GuideControllerMac(popupLauncher, toastr, $timeout, $http, $scope, $q, item, config, deviceService, packageService, socketService, eventService, inventoryService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.selectedDevice = null;
        vm.step = null;
        vm.guideUrl = config.guidesPath + '/Mac/' + config.guidesIndexFile;
        vm.ready = false;
        vm.success = false;
        vm.finished = false;
        vm.percentageComplete = 0;
        vm.PowerGood = false;
        vm.ExternalGood = false;
        vm.ButtonsGood = false;
        var usbDeviceMinSize = 4000;
        var acc = document.getElementsByClassName("accordion");
        var i;

        for (i = 0; i < acc.length; i++) {
            acc[i].onclick = function() {
                this.classList.toggle("active");
                var panel = this.nextElementSibling;
                if (panel.style.maxHeight){
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
            }
        }
        vm.steps = {
            prepare: {
                name: 'prepareUSBdrive',
                number: 1,
                title: 'Prepare USB drive'
            },
            refresh: {
                name: 'refreshMac',
                number: 2,
                title: 'Refresh MAC'
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
        vm.step = vm.steps.prepare;
        activate();
        vm.prepareRefreshUsbStart = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.insertUsbToStation;
            waitForUsbAdd(usbDeviceMinSize, prepareRefreshUsbApply);
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            var queries = [
                inventoryService.startSession(item),
                eventService.DisableDeviceNotification()
            ];
            $q.all(queries).then(function() {
                vm.checkCondition();
            });
        }
        vm.startResult = function() {
            if (!vm.ExternalGood) {
                // Exterior Check
                vm.finishFailed();
            } else if (!vm.PowerGood) {
                // Check the Battery
                vm.finishFailed();
            } else if (!vm.ButtonsGood) {
                // Screen & Buttons
                vm.finishFailed();
            } else {
                //All Good, Continue to the next step
                vm.prepareRefreshUsbStart();
            }
        };
        vm.startResultLast = function() {
            $timeout(vm.startResult, 500);
        };
        vm.addUSB = function() {
            var url = 'http://localhost:3000/event/device-add';
            var headers = {'content-type': 'application/json'};

            $http({
                url: url,
                method: 'POST',
                headers: headers,
                data: {'id':'sdc', 'type': 'USB', 'manufacturer':'Generic', 'serial':'C5168175', 'size':'1982464'}
            }).then(function(response){
                //success
            },function(resonse){
                //error
            })
        };
        vm.removeUsb = function() {
            var url = 'http://localhost:3000/event/device-remove';
            var headers = {'content-type': 'application/json'};

            $http({
                url: url,
                method: 'POST',
                headers: headers,
                data: {'id':'sdc', 'type': 'USB', 'manufacturer':'Generic', 'serial':'C5168175', 'size':'1982464'}
            }).then(function(response){
                //success
            },function(resonse){
                //error
            })
        };
        vm.checkCondition = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.checkCondition;
            //waitForUsbAdd(usbDeviceMinSize, prepareRefreshUsbApply);
        };

        vm.finishFailed = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.deviceBroken;
        };
        function prepareRefreshUsbApply(data) {
            vm.substep = vm.substeps.usbLoading;
            vm.responseStatus = '';
            console.log(data);
            $http({
                url: 'http://localhost:3000/prepareusb',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: data
            }).then(function(response){
                vm.responseStatus = response.status;
            });
            $scope.$watch('vm.responseStatus', function () {
                if (vm.responseStatus = 200) {
                    socketService.on('usb-progress', function(data) {
                        vm.percentageComplete += data.progress;
                        if (vm.percentageComplete = 100) {
                            console.log(data.progress);
                            $timeout(function () {
                                prepareRefreshUsbComplete();
                            }, 2000);
                        }
                    });
                } else {
                    vm.step = vm.steps.prepare;
                    vm.substep = vm.substeps.usbLoadFailed;
                }
            });

        }
        function waitForUsbAdd(minSize, callback) {
            if (vm.selectedDevice === null) {
                socketService.once('device-add', function(data) {
                    if (data.size >= minSize) {
                        vm.selectedDevice = data;
                        callback(vm.selectedDevice);
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
                callback();
            }
        }

        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.refresh;
            waitForUsbRemove(macRefreshStart);
        }

        function macRefreshStart() {
            waitForUsbAdd(usbDeviceMinSize, verifyRefreshStart);
        }

        function verifyRefreshStart() {
            vm.step = vm.steps.finish;
            vm.substep = vm.substeps.refreshSuccess;

        }
        function waitForUsbRemove(callback) {
            socketService.once('device-remove', function(data) {
                if (data.id === vm.selectedDevice.id) {
                    vm.selectedDevice = null;
                    callback();
                    toastr.error('Follow further instructions on screen', 'USB Drive Removed', {
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
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.checkCondition;
            vm.PowerGood = false;
            vm.ExternalGood = false;
            vm.ButtonsGood = false;
        };
    }
})();
