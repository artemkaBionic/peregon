(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerXboxOne', GuideControllerXboxOne);

    GuideControllerXboxOne.$inject = ['$q', '$stateParams', 'config', 'guideService', 'deviceService', 'packageService', 'socketService', 'eventService'];

    function GuideControllerXboxOne($q, $stateParams, config, guideService, deviceService, packageService, socketService, eventService) {
        var refreshMediaPackageName = 'Xbox One Refresh';
        var updateMediaPackageName = 'Xbox One Update';
        var usbDeviceMinSize = 4000000000;

        /*jshint validthis: true */
        var vm = this;
        vm.selectedDevice = null;
        vm.devices = [];
        vm.refreshMediaPackage = null;
        vm.updateMediaPackage = null;
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
            prepareUpdateUsbInsert: {
                name: 'prepareUpdateUsbInsert',
                number: 7,
                title: 'Prepare USB Drive for Update (Insert Drive)'
            },
            prepareUpdateUsbInProgress: {
                name: 'prepareUpdateUsbInProgress',
                number: 8,
                title: 'Prepare USB Drive for Update (Preparing Drive)'
            },
            prepareUpdateUsbComplete: {
                name: 'prepareUpdateUsbComplete',
                number: 9,
                title: 'Prepare USB Drive for Update (Drive is Ready)'
            },
            updateXbox: {
                name: 'updateXbox',
                number: 10,
                title: 'Update the Xbox'
            },
            complete: {
                name: 'complete',
                number: 11,
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
            var queries = [loadDevices(), loadMediaPackages()];
            $q.all(queries);
        }

        function loadDevices() {
            deviceService.getDevices().then(function(devices) {
                vm.devices = devices;
                if (vm.selectedDevice === null && vm.devices.length > 0) {
                    for (var i = vm.devices.length - 1; i >= 0; --i) {
                        if (vm.devices[i].size >= usbDeviceMinSize) {
                            vm.selectedDevice = vm.devices[0];
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
                    } else if (vm.updateMediaPackage === null && mediaPackages[i].name === updateMediaPackageName) {
                        vm.updateMediaPackage = mediaPackages[i];
                    }
                }
            });
        }

        function waitForUsbAdd(minSize, callback) {
            if (vm.selectedDevice === null) {
                eventService.DisableDeviceNotification();
                socketService.once('event', function(event) {
                    if (event.name === 'device-add') {
                        if (event.data.size >= minSize) {
                            vm.selectedDevice = event.data;
                            eventService.EnableDeviceNotification();
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
            if (vm.devices.length === 0) {
                vm.selectedDevice = null;
                callback();
            } else {
                socketService.once('event', function(event) {
                    if (event.name === 'device-remove' && event.data.id === vm.selectedDevice.id) {
                        vm.selectedDevice = null;
                        callback();
                    } else {
                        waitForUsbRemove(callback);
                    }
                });
            }
        }

        vm.prepareRefreshUsbStart = function() {
            if (vm.refreshMediaPackage === null) {
                vm.errorMessage = refreshMediaPackageName + ' files are missing.';
                vm.step = vm.steps.failed;
            } else {
                vm.step = vm.steps.prepareRefreshUsbInsert;
                waitForUsbAdd(usbDeviceMinSize, prepareRefreshUsbApply);
            }
        };

        vm.retry = function() {
            activate();
            vm.prepareRefreshUsbStart();
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
                    prepareUpdateUsbStart();
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

        function prepareUpdateUsbStart() {
            if (vm.updateMediaPackage === null) {
                vm.errorMessage = updateMediaPackageName + ' files are missing.';
                vm.step = vm.steps.failed;
            } else {
                vm.step = vm.steps.prepareUpdateUsbInsert;
                waitForUsbAdd(usbDeviceMinSize, prepareUpdateUsbApply);
            }
        }

        function prepareUpdateUsbApply() {
            vm.step = vm.steps.prepareUpdateUsbInProgress;

            socketService.once('device-apply-progress', function(data) {
                if (data.progress >= 100) {
                    prepareUpdateUsbComplete();
                }
            });

            socketService.once('device-apply-failed', function(data) {
                socketService.removeAllListeners('device-apply-progress');
                vm.errorMessage = data.message;
                vm.step = vm.steps.failed;
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.media = vm.updateMediaPackage;
            socketService.emit('device-apply', data);
        }

        function prepareUpdateUsbComplete() {
            vm.step = vm.steps.prepareUpdateUsbComplete;
            waitForUsbRemove(updateXboxStart);
        }

        function updateXboxStart() {
            vm.step = vm.steps.updateXbox;
            waitForUsbAdd(usbDeviceMinSize, function() {
                vm.step = vm.steps.complete;
            });
        }
    }
})();
