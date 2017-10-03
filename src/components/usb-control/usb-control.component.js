(function() {
    'use strict';

    angular
        .module('app.user')
        .component('usbControl',
            {
                bindings: {
                    session: '<',
                    item: '<'
                },
                controller: usbControlController,
                controllerAs: 'vm',
                templateUrl: 'components/usb-control/usb-control.template.html'
            }
        );

    usbControlController.$inject = ['env', '$http', 'inventoryService', 'toastr', '$rootScope'];

    function usbControlController(env, $http, inventoryService, toastr, $rootScope) {
        var vm = this;
        var socket = io.connect('http://' + env.baseUrl);
        vm.steps = {
            noBootDevices: {
                name: 'noBootDevices',
                number: 1
            },
            newBootDevice: {
                name: 'newBootDevice',
                number: 2
            },
            bootDevicesProcessing: {
                name: 'bootDevicesProcessing',
                number: 3
            },
            bootDevicesReady: {
                name: 'bootDevicesReady',
                number: 4
            }
        };
        console.log(vm.item);
        if (vm.item) {
            vm.iconStyle = {
                'width': '80px',
                'height': '80px',
                'line-height': '80px'
            };
            vm.guideStyle = {'font-size': '16pt','margin-top':'5vh'};
            vm.guideTitle = {'font-size': '18pt'};
        }
        checkUsbStatus();
        function checkUsbStatus() {
            inventoryService.getAllUsbDrives().then(function(usbDrives) {
                vm.usbDrives = usbDrives;
                console.log(usbDrives);
                if (usbDrives.usbData.status === 'newBootDevice') {
                    newBootDevice();
                } else if (usbDrives.usbData.status === 'bootDevicesReady') {
                    if (vm.item !== undefined) {
                        $http({
                            url: '/createItemFiles',
                            method: 'POST',
                            headers: {'content-type': 'application/json'},
                            data: {item: vm.item}
                        }).then(function() {
                            prepareRefreshUsbComplete();
                        });
                    } else {
                        prepareRefreshUsbComplete();
                    }
                } else if (usbDrives.usbData.status === 'noBootDevices') {
                    prepareRefreshUsbStart();
                } else {
                    showBootDeviceProgress();
                }
            }).catch(function(err) {
                console.log(err);
            });
        }
        function usbProgress(data) {
            vm.percentageComplete = data.progress;
        }
        function prepareRefreshUsbStart() {
            vm.step = vm.steps.noBootDevices;
        }
        function newBootDevice(){
            vm.step = vm.steps.newBootDevice;
        }
        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.bootDevicesReady;
            waitForUsbRemove(emitToController);
        }
        function emitToController() {
            $rootScope.$broadcast('bootDevicesReady');
        }
        function showBootDeviceProgress() {
            vm.step = vm.steps.bootDevicesProcessing;
            inventoryService.getLowestUsbInProgress().then(function(usbDrive){
                usbProgress(usbDrive);
            });
        }
        vm.createBootDrives = function() {
            $http({
                url: '/prepareUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'}
            }).then(function(){
                showBootDeviceProgress();
            });
        };
        function waitForUsbRemove(callback) {
            socket.on('device-remove', function() {
                callback();
            });
        }
        socket.on('device-add', function() {
            checkUsbStatus();
        });
        socket.on('device-remove', function() {
            checkUsbStatus();
        });
        socket.on('usb-progress', function() {
            checkUsbStatus();
        });
        socket.on('usb-complete', function() {
            checkUsbStatus();
        });
    }
})();
