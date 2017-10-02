(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerUsb', GuideControllerUsb);

    GuideControllerUsb.$inject = ['$http', '$scope', 'item', 'inventoryService', '$state', 'env'];

    function GuideControllerUsb($http, $scope, item, inventoryService, $state, env) {
        var socket = io.connect('http://' + env.baseUrl);
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.selectedDevice = null;
        vm.refreshMediaPackage = null;
        vm.sessionId = null;
        vm.usbDrives = {};
        vm.session = {};
        vm.steps = {
            checkCondition: {
                name: 'checkCondition',
                number: 1,
                title: 'Check condition'
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
            newBootDevice: {
                name: 'newBootDevice',
                number: 5,
                title: 'New Boot Device'
            },
            refreshDevice: {
                name: 'refreshDevice',
                number: 6,
                title: 'Refresh the Device'
            },
            verifyRefresh: {
                name: 'verifyRefresh',
                number: 7,
                title: 'Verify Refresh'
            },
            complete: {
                name: 'complete',
                number: 8,
                title: 'Refresh is Complete'
            },
            failed: {
                name: 'failed',
                number: 0,
                title: 'Refresh Failed'
            }

        };
        checkSession();
        function isEmptyObject(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    return false;
                }
            }
            return true;
        }
        function checkSession(){
            inventoryService.getSessionByParams({
                'device.item_number': vm.item.InventoryNumber,
                'status': 'Incomplete'
            }).then(function(session) {
                if (session){
                    updateSession(session)
                } else {
                    checkCondition();
                }
            });
        }
        function updateSession(session) {
            vm.session = session;
            if (session.status === 'Success') {
                vm.step = vm.steps.complete;
            } else if (session.status === 'Incomplete') {
                if (!isEmptyObject(session.tmp)) {
                    if (session.tmp.currentStep === 'refreshStarted') {
                        refreshDevicesStarted();
                    }
                } else {
                    checkUsbStatus(session);
                }
            } else {
                vm.step = vm.steps.failed;
            }
        }
        function checkUsbStatus() {
            console.log('here');
            inventoryService.getAllUsbDrives().then(function(usbDrives) {
                vm.usbDrives = usbDrives;
                console.log(usbDrives);
                if (usbDrives.usbData.status === 'newBootDevice') {
                    newBootDevice();
                } else if (usbDrives.usbData.status === 'bootDevicesReady') {
                    $http({
                        url: '/createItemFiles',
                        method: 'POST',
                        headers: {'content-type': 'application/json'},
                        data: {item: item}
                    }).then(function() {
                        prepareRefreshUsbComplete();
                    });
                } else if (usbDrives.usbData.status === 'noBootDevices') {
                    prepareRefreshUsbStart();
                } else {
                    showBootDeviceProgress();
                }
            }).catch(function(err) {
                console.log(err);
            });
        }
        function newBootDevice(){
            vm.step = vm.steps.newBootDevice;
        }
        vm.startSession = function() {
            vm.sessionId = new Date().toISOString();
            inventoryService.startSession(vm.sessionId, item).then(function(session){
                vm.session = session;
                checkUsbStatus();
            });
        };
        vm.deviceBroken = function() {
            vm.sessionId = new Date().toISOString();
            inventoryService.startSession(vm.sessionId, item).then(function(session){
                    inventoryService.updateSession(session, 'Info',
                        'Device is broken').then(function(session) {
                        inventoryService.finishSession(session._id, {'complete': false}).then(function(){
                            vm.refreshEnd();
                        });
                    });
                }
            );
        };
        function checkCondition() {
            vm.step = vm.steps.checkCondition;
        }
        function usbProgress(data) {
            vm.percentageComplete = data.progress;
        }
        function refreshDevicesStarted() {
            vm.step = vm.steps.refreshDevice;
            socket.off('usb-complete');
            socket.off('usb-progress');
        }
        vm.createBootDrives = function(){
            $http({
                url: '/prepareUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'}
            }).then(function(){
                showBootDeviceProgress();
            });
        };
        function waitForUsbAdd(callback) {
            socket.on('device-add', function() {
                console.log(callback);
                callback();
            });
        }
        function waitForUsbRemove(callback) {
            socket.on('device-remove', function() {
                console.log('removing');
                callback();
            });
        }

        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.prepareRefreshUsbComplete;
            waitForUsbRemove(refreshDevicesStart);
        }
        function showBootDeviceProgress() {
            vm.step = vm.steps.prepareRefreshUsbInProgress;
            inventoryService.getLowestUsbInProgress().then(function(usbDrive){
                usbProgress(usbDrive);
            });
        }
        function prepareRefreshUsbStart() {
            vm.step = vm.steps.prepareRefreshUsbInsert;
            waitForUsbAdd(newBootDevice);
        }
        function refreshDevicesStart(){
            vm.step = vm.steps.refreshDevice;
            socket.off('usb-complete');
            socket.off('usb-progress');
            vm.session.tmp.currentStep = 'refreshStarted';
            inventoryService.updateSession(vm.session,'Info','Refresh Started','');
        }
        socket.on('usb-progress', function() {
            checkSession();
        });
        socket.on('device-add', function() {
            checkSession();
        });
        socket.on('usb-complete', function() {
            checkSession();
        });
        socket.on('session-complete', function(session){
            if (session._id === vm.session._id) {
                updateSession(session);
            }
        });
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();
