(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerXboxOne', GuideControllerXboxOne);

    GuideControllerXboxOne.$inject = ['$q', '$stateParams', 'config', 'guideService', 'deviceService', 'packageService', 'socketService', 'eventService'];

    function GuideControllerXboxOne($q, $stateParams, config, guideService, deviceService, packageService, socketService, eventService) {
        /*jshint validthis: true */
        var vm = this;
        vm.guide = {};
        vm.guideUrl = config.guidesPath + '/' + $stateParams.guide + '/' + config.guidesIndexFile;
        vm.ready = false;
        vm.selectedDevice = null;
        vm.devices = [];
        vm.selectedMediaPackage = null;
        vm.steps = {
            details: {
                name: 'details',
                title: 'Enter Details'
            },
            prepareUsbInsert: {
                name: 'prepareUsbInsert',
                title: 'Prepare USB Drive (Insert Drive)'
            },
            prepareUsbInProgress: {
                name: 'prepareUsbInProgress',
                title: 'Prepare USB Drive (Preparing Drive)'
            },
            prepareUsbComplete: {
                name: 'prepareUsbComplete',
                title: 'Prepare USB Drive (Drive is Ready)'
            },
            refreshXbox: {
                name: 'refreshXbox',
                title: 'Refresh the Xbox'
            },
            verifyRefresh: {
                name: 'verifyRefresh',
                title: 'Verify Refresh'
            },
            complete: {
                name: 'complete',
                title: 'Xbox Refresh is Complete'
            },
            failed: {
                name: 'failed',
                title: 'Xbox Refresh Failed'
            }
        };
        vm.step = vm.steps.details;
        vm.itemNumber = null;

        activate();

        function activate() {
            var queries = [loadDevices(), loadMediaPackages()];
            queries.push(guideService.getGuide($stateParams.guide).then(function(guide) {
                vm.guide = guide;
            }));
            queries.push(loadDevices());
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadDevices() {
            deviceService.getDevices().then(function(devices) {
                vm.devices = devices;
                if (vm.devices.length > 0) {
                    vm.selectedDevice = vm.devices[0];
                }
            });
        }

        function loadMediaPackages() {
            packageService.getMediaPackages('xbox-one').then(function(mediaPackages) {
                vm.selectedMediaPackage = mediaPackages[0];
            });
        }

        vm.setStep = function(stepName) {
            vm.step = vm.steps[stepName];
        };

        vm.prepareUsbStart = function() {
            if (vm.devices.length === 0) {
                vm.step = vm.steps.prepareUsbInsert;
                eventService.DisableDeviceNotification();
                socketService.once('event', function(event) {
                    if (event.name === 'device-add') {
                        vm.selectedDevice = event.data;
                        eventService.EnableDeviceNotification();
                        prepareUsbApply();
                    }
                });
            } else {
                prepareUsbApply();
            }
        };

        var prepareUsbApply = function() {
            vm.step = vm.steps.prepareUsbInProgress;

            socketService.once('device-apply-progress', function(data) {
                if (data.progress >= 100) {
                    prepareUsbComplete();
                }
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.media = vm.selectedMediaPackage;
            socketService.emit('device-apply', data);
        };

        var prepareUsbComplete = function() {
            vm.step = vm.steps.prepareUsbComplete;
            if (vm.devices.length === 0) {
                refreshXboxStart();
            } else {
                vm.step = vm.steps.prepareUsbComplete;
                eventService.DisableDeviceNotification();
                socketService.once('event', function(event) {
                    if (event.name === 'device-remove' && event.data.id === vm.selectedDevice.id) {
                        vm.selectedDevice = null;
                        eventService.EnableDeviceNotification();
                        refreshXboxStart();
                    }
                });
            }
        };

        var refreshXboxStart = function() {
            vm.step = vm.steps.refreshXbox;

            eventService.DisableDeviceNotification();
            socketService.once('event', function(event) {
                if (event.name === 'device-add') {
                    vm.selectedDevice = event.data;
                    eventService.EnableDeviceNotification();
                    verifyRefreshStart();
                }
            });
        };

        var verifyRefreshStart = function() {
            vm.step = vm.steps.verifyRefresh;

            socketService.once('verify-refresh-progress', function(progress) {
                if (progress >= 100) {
                    verifyRefreshComplete();
                }
            });

            socketService.once('verify-refresh-failed', function() {
                verifyRefreshFailed();
            });

            var data = {};
            data.device = vm.selectedDevice;
            data.refreshType = 'xbox-one';
            socketService.emit('verify-refresh', data);
        };

        var verifyRefreshComplete = function() {
            vm.step = vm.steps.complete;
        };

        var verifyRefreshFailed = function() {
            vm.step = vm.steps.failed;
        };
    }
})();
