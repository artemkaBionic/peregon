(function() {
    'use strict';

    angular.module('app.user').component('usbControl',
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
            }
        };
        if (vm.item) {
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

        function usbProgress(progress) {
            vm.step = vm.steps.bootDevicesProcessing;
            vm.percentageComplete = progress;
        }

        function prepareRefreshUsbStart() {
            vm.step = vm.steps.noBootDevices;
        }

        function newBootDevice() {
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
            inventory.getLowestUsbInProgress().then(function(minProgress) {
                usbProgress(minProgress);
            });
        }

        vm.createBootDrives = function() {
            $http({
                url: '/prepareAllUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'}
            }).then(function() {
                showBootDeviceProgress();
            });
        };

        function waitForUsbRemove(callback) {
            socket.on('device-remove', function() {
                callback();
            });
        }

        socket.on('device-add', function(usbData) {
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
