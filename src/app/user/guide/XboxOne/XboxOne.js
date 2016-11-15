(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerXboxOne', GuideControllerXboxOne);

    GuideControllerXboxOne.$inject = ['$q', 'deviceService', 'packageService', 'socketService', 'eventService'];

    function GuideControllerXboxOne($q, deviceService, packageService, socketService, eventService) {
        var refreshMediaPackageName = 'Xbox One Refresh';
        var usbDeviceMinSize = 4000000000;

        /*jshint validthis: true */
        var vm = this;
        vm.selectedDevice = null;
        vm.refreshMediaPackage = null;
        vm.steps = {
            details: {
                name: 'details',
                number: 1,
                title: 'Enter Details'
            },
            prepareRefreshUsbInsert: {
                name: 'prepareRefreshUsbInsert',
                number: 2,
                title: 'Prepare USB Drive for Refresh (Insert Drive)'
            },
            prepareRefreshUsbInProgress: {
                name: 'prepareRefreshUsbInProgress',
                number: 3,
                title: 'Prepare USB Drive for Refresh (Preparing Drive)'
            },
            prepareRefreshUsbComplete: {
                name: 'prepareRefreshUsbComplete',
                number: 4,
                title: 'Prepare USB Drive for Refresh (Drive is Ready)'
            },
            refreshXbox: {
                name: 'refreshXbox',
                number: 5,
                title: 'Refresh the Xbox'
            },
            verifyRefresh: {
                name: 'verifyRefresh',
                number: 6,
                title: 'Verify Refresh'
            },
            complete: {
                name: 'complete',
                number: 7,
                title: 'Xbox Refresh is Complete'
            },
            failed: {
                name: 'failed',
                number: 0,
                title: 'Xbox Refresh Failed'
            }
        };

        vm.step = vm.steps.details;
        vm.itemNumber = null;
        vm.errorMessage = '';

        activate();

        function activate() {
            var queries = [eventService.DisableDeviceNotification(), loadDevices(), loadMediaPackages()];
            $q.all(queries);
        }

        vm.$onDestroy = function() {
            eventService.EnableDeviceNotification();
        };

        function loadDevices() {
            deviceService.getDevices().then(function(devices) {
                if (vm.selectedDevice === null && devices.length > 0) {
                    for (var i = devices.length - 1; i >= 0; --i) {
                        if (devices[i].size >= usbDeviceMinSize) {
                            vm.selectedDevice = devices[i];
                            break;
                        }
                    }
                }
            });
        }

        function loadMediaPackages() {
            packageService.getMediaPackages('xbox-one').then(function(mediaPackages) {
                for (var i = mediaPackages.length - 1; i >= 0; --i) {
                    if (vm.refreshMediaPackage === null && mediaPackages[i].name === refreshMediaPackageName) {
                        vm.refreshMediaPackage = mediaPackages[i];
                    }
                }
            });
        }

        function waitForUsbAdd(minSize, callback) {
            if (vm.selectedDevice === null) {
                socketService.once('event', function(event) {
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
            socketService.once('event', function(event) {
                if (event.name === 'device-remove' && event.data.id === vm.selectedDevice.id) {
                    vm.selectedDevice = null;
                    callback();
                } else {
                    waitForUsbRemove(callback);
                }
            });
        }

        vm.retry = function() {
            activate();
            vm.prepareRefreshUsbStart();
        };

        vm.prepareRefreshUsbStart = function() {
            if (vm.refreshMediaPackage === null) {
                vm.errorMessage = refreshMediaPackageName + ' files are missing.';
                vm.step = vm.steps.failed;
            } else {
                vm.step = vm.steps.prepareRefreshUsbInsert;
                waitForUsbAdd(usbDeviceMinSize, prepareRefreshUsbApply);
            }
        };

        function prepareRefreshUsbApply() {
            vm.step = vm.steps.prepareRefreshUsbInProgress;

            socketService.once('device-apply-progress', function(data) {
                if (data.progress >= 100) {
                    prepareRefreshUsbComplete();
                }
            });

            socketService.once('device-apply-failed', function(data) {
                socketService.removeAllListeners('device-apply-progress');
                vm.errorMessage = data.message;
                vm.step = vm.steps.failed;
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.media = vm.refreshMediaPackage;
            socketService.emit('device-apply', data);
        }

        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.prepareRefreshUsbComplete;
            waitForUsbRemove(refreshXboxStart);
        }

        function refreshXboxStart() {
            vm.step = vm.steps.refreshXbox;
            waitForUsbAdd(usbDeviceMinSize, verifyRefreshStart);
        }

        function verifyRefreshStart() {
            vm.step = vm.steps.verifyRefresh;

            socketService.once('verify-refresh-progress', function(data) {
                if (data.progress >= 100) {
                    vm.step = vm.steps.complete;
                }
            });

            socketService.once('verify-refresh-failed', function(data) {
                socketService.removeAllListeners('verify-refresh-progress');
                vm.errorMessage = data.message;
                vm.step = vm.steps.failed;
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.refreshType = 'xbox-one';
            data.itemNumber = vm.itemNumber;
            socketService.emit('verify-refresh', data);
        }
    }
})();
