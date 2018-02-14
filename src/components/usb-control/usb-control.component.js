(function() {
    'use strict';

    angular.module('app.user').component('usbControl',
        {
            bindings: {
                guide: '<'
            },
            controller: usbControlController,
            controllerAs: 'vm',
            templateUrl: 'components/usb-control/usb-control.template.html'
        }
    );

    usbControlController.$inject = [
        '$http',
        'inventoryService',
        'socketService',
        '$rootScope'];

    function usbControlController($http, inventory, socket, $rootScope) {
        var vm = this;
        vm.showSmallUsbError = false;
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
            },
            bootDevicesFailed: {
                name: 'bootDevicesFailed',
                number: 5
            }
        };
        if (vm.guide) {
            vm.iconBackground = {
                'width': '100px',
                'height': '100px',
                'line-height': '100px'
            };
            vm.usbIcon = {
                'font-size': '25pt'
            };
            vm.guideStyle = {
                'font-size': '16pt',
                'margin-top': '5vh'
            };
            vm.guideTitle = {
                'font-size': '18pt'
            };
        }
        checkUsbStatus();

        function checkUsbStatus() {
            inventory.getAllUsbDrives().then(function(usbDrives) {
                vm.usbDrives = usbDrives;
                vm.showSmallUsbError = usbDrives.usbData.isSmallUsbDriveInserted;
                switch (usbDrives.usbData.status) {
                    case 'newBootDevice':
                        vm.step = vm.steps.newBootDevice;
                        break;
                    case 'bootDevicesProcessing':
                        showBootDeviceProgress();
                        break;
                    case 'bootDevicesFailed':
                        vm.step = vm.steps.bootDevicesFailed;
                        break;
                    case 'noBootDevices':
                        vm.step = vm.steps.noBootDevices;
                        break;
                    case 'bootDevicesReady':
                        if (vm.step !== vm.steps.bootDevicesFailed) {
                            if (vm.guide) {
                                $rootScope.$broadcast('bootDevicesReady');
                            } else {
                                vm.step = vm.steps.bootDevicesReady;
                            }
                        }
                        break;
                }
            });
        }

        function usbProgress(progress) {
            vm.step = vm.steps.bootDevicesProcessing;
            vm.percentageComplete = progress;
        }

        function showBootDeviceProgress() {
            inventory.getLowestUsbProgress().then(function(minProgress) {
                usbProgress(minProgress);
            });
        }

        vm.createBootDrives = function() {
            usbProgress(0);
            $http({
                url: '/prepareAllUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'}
            });
        };

        socket.on('device-add', function() {
            checkUsbStatus();
        });
        socket.on('device-remove', function() {
            checkUsbStatus();
        });
        socket.on('usb-progress', function(progress) {
            usbProgress(progress);
        });
        socket.on('usb-complete', function() {
            checkUsbStatus();
        });
    }
})();
