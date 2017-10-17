(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('MediaController', MediaController);

    MediaController.$inject = ['$stateParams', '$q', '$location', 'deviceService', 'packageService', 'socketService'];

    function MediaController($stateParams, $q, $location, deviceService, packageService, socket) {
        /*jshint validthis: true */
        var vm = this;
        vm.selectedDevice = null;
        vm.selectedMediaPackage = null;
        vm.mediaPackages = [];
        vm.steps = {
            selectMedia: {
                name: 'selectMedia',
                number: 1,
                title: 'Select Media'
            },
            applyMediaInsert: {
                name: 'applyMediaInsert',
                number: 2,
                title: 'Apply Media to USB Drive (Insert Drive)'
            },
            applyMediaInProgress: {
                name: 'applyMediaInProgress',
                number: 3,
                title: 'Apply Media to USB Drive (Preparing Drive)'
            },
            complete: {
                name: 'complete',
                number: 4,
                title: 'Apply Media to USB Drive is Complete'
            },
            failed: {
                name: 'failed',
                number: 0,
                title: 'Apply Media to USB Drive Failed'
            }
        };
        vm.step = vm.steps.selectMedia;

        activate();

        function activate() {
            var queries = [loadDevices(), loadMediaPackages()];
            $q.all(queries);
        }

        function loadDevices() {
            deviceService.getDevices().then(function(devices) {
                if ($stateParams.deviceId !== null) {
                    vm.selectedDevice = devices[$stateParams.deviceId];
                } else {
                    if (Object.keys(devices).length === 1) {
                        vm.selectedDevice = devices[Object.keys(devices)[0]];
                    }
                }
            });
        }

        function loadMediaPackages() {
            packageService.getMediaPackages().then(function(mediaPackages) {
                vm.mediaPackages = mediaPackages;
            });
        }

        function waitForUsbAdd(minSize, callback) {
            if (vm.selectedDevice === null) {
                socket.once('event', function(event) {
                    if (event.name === 'device-add') {
                        if (event.data.size >= minSize) {
                            vm.selectedDevice = event.data;
                            callback();
                        } else {
                            waitForUsbAdd(minSize, callback);
                        }
                    }
                });
            } else {
                callback();
            }
        }

        function waitForUsbRemove(callback) {
            socket.once('event', function(event) {
                if (event.name === 'device-remove' && event.data.id === vm.selectedDevice.id) {
                    vm.selectedDevice = null;
                    callback();
                } else {
                    waitForUsbRemove(callback);
                }
            });
        }

        vm.selectMediaPackage = function(mediaPackage) {
            vm.selectedMediaPackage = mediaPackage;
            vm.applyMediaStart();
        };

        vm.applyMediaStart = function() {
            vm.step = vm.steps.applyMediaInsert;
            waitForUsbAdd(vm.selectedMediaPackage.size, applyMediaApply);
        };

        function applyMediaApply() {
            vm.step = vm.steps.applyMediaInProgress;

            socket.once('device-apply-progress', function(data) {
                if (data.progress >= 100) {
                    applyMediaComplete();
                }
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.media = vm.selectedMediaPackage;
            socket.emit('device-apply', data);
        }

        function applyMediaComplete() {
            vm.step = vm.steps.complete;
            waitForUsbRemove(function() {
                $location.path('#/user/home');
            });
        }
    }
})();
