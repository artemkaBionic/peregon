(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerXboxOne', GuideControllerXboxOne);

    GuideControllerXboxOne.$inject = ['$q', 'item', 'deviceService', 'packageService', 'env', 'eventService', 'inventoryService', '$state'];

    function GuideControllerXboxOne($q, item, deviceService, packageService, env, eventService, inventoryService, $state) {
        var refreshMediaPackageName = 'Xbox One Refresh';
        var usbDeviceMinSize = 4000000000;
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
            refreshXbox: {
                name: 'refreshXbox',
                number: 6,
                title: 'Refresh the Xbox'
            },
            verifyRefresh: {
                name: 'verifyRefresh',
                number: 7,
                title: 'Verify Refresh'
            },
            complete: {
                name: 'complete',
                number: 8,
                title: 'Xbox Refresh is Complete'
            },
            failed: {
                name: 'failed',
                number: 0,
                title: 'Xbox Refresh Failed'
            }

        };
        checkSession();
        function isEmptyObject(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        }
        function checkSession(){
            inventoryService.getSessionByParams({
                'device.item_number': vm.item.InventoryNumber,
                'status': 'Incomplete'
            }).then(function(session) {
                if (session){
                    vm.session = session;
                    if (!isEmptyObject(session.tmp)) {
                        if (session.tmp.currentStep === 'refreshStarted') {
                            refreshXboxStarted();
                        }
                    } else {
                        checkUsbStatus();
                    }
                } else {
                    vm.sessionId = new Date().toISOString();
                    inventoryService.startSession(vm.sessionId, item).then(function(session){
                        console.log(session);
                        vm.session = session;
                        checkUsbStatus();
                    });
                }
            });
        }
        function checkUsbStatus() {
            inventoryService.getAllUsbDrives().then(function(usbDrives) {
                vm.usbDrives = usbDrives;
                if (usbDrives.usbData.status === 'newBootDevice') {
                    vm.step = vm.steps.newBootDevice;
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
            })
        }
        function usbProgress(data) {
            console.log(data);
            vm.percentageComplete = data.progress;
        }
        function refreshXboxStarted() {
            vm.step = vm.steps.refreshXbox;
            //waitForUsbAdd();
        }
        vm.createBootDrives = function(){
            // $http({
            //     url: '/prepareUsb',
            //     method: 'POST',
            //     headers: {'content-type': 'application/json'},
            // });
            console.log('creating boot drive');
        };
        function waitForUsbAdd(callback) {
            if (vm.selectedDevice === null) {
                socket.once('device-add', function(data) {
                    if (data.size >= minSize) {
                        vm.selectedDevice = data;
                        callback();
                    } else {
                        waitForUsbAdd(callback);
                    }
                });
            } else {
                callback();
            }
        }

        function waitForUsbRemove(callback) {
            socket.once('device-remove', function() {
                callback();
            });
        }

        function prepareRefreshUsbComplete() {
            vm.step = vm.steps.prepareRefreshUsbComplete;
            waitForUsbRemove(refreshXboxStart);
        }
        function showBootDeviceProgress() {
            vm.step = vm.steps.prepareRefreshUsbInProgress;
            inventoryService.getLowestUsbInProgress().then(function(usbDrive){
                usbProgress(usbDrive);
            });
        }
        function prepareRefreshUsbStart() {
            vm.step = vm.steps.prepareRefreshUsbInsert;
            //waitForUsbAdd(usbDeviceMinSize, prepareRefreshUsbApply);
        }
        function refreshXboxStart(){
            vm.step = vm.steps.refreshXbox;
            vm.session.tmp.currentStep = 'refreshStarted';
            inventoryService.updateSession(vm.session,'','','')
        }
        socket.on('device-add', function() {
            checkSession();
        });
        socket.on('usb-progress', function() {
            checkSession();
        });
        socket.on('usb-complete', function() {
            checkSession();
        });
        socket.on('usb-session-complete', function() {
            checkSession();
        });
        // function startSession(session) {
        //     if (!session) {
        //         vm.sessionId = new Date().toISOString();
        //         inventoryService.startSession(vm.sessionId, item);
        //     } else {
        //         checkStep();
        //     }
        // }
        // vm.step = vm.steps.prepareRefreshUsbInsert;
        // vm.errorMessage = '';
        //
        // vm.$onDestroy = function() {
        //     eventService.EnableDeviceNotification();
        // };
        //
        // function checkDevicesStatus() {
        //     inventoryService.getLowestUsbInProgress().then(function(usbDrives){
        //         if (usbDrives.message === 'No usb drives were added to refresh station') {
        //           //  vm.step = vm.steps.prepareRefreshUsbInsert;
        //         } else if (usbDrives.message === 'All usb drives are ready') {
        //            //checkStep('prepareRefreshUsbComplete');
        //             prepareRefreshUsbComplete();
        //             waitForUsbRemove(prepareRefreshUsbApply)
        //         } else {
        //             vm.selectedDevice = usbDrives;
        //          // vm.step = vm.steps.prepareRefreshUsbInProgress;
        //         }
        //     });
        // }
        // vm.retry = function() {
        //     activate();
        // };
        //
        // function prepareRefreshUsbApply() {
        //     vm.step = vm.steps.prepareRefreshUsbInProgress;
        //     socketService.once('usb-progress', function(data) {
        //
        //     });
        // }
        // function verifyRefreshStart() {
        //     vm.step = vm.steps.verifyRefresh;
        //
        //     var data = {};
        //     data.device = vm.selectedDevice;
        //     inventoryService.finishSession(vm.item.InventoryNumber, data).then(function(success) {
        //         if (success) {
        //             vm.step = vm.steps.complete;
        //         } else {
        //             vm.errorMessage = 'Factory reset did not complete correctly.';
        //             vm.step = vm.steps.failed;
        //         }
        //     });
        // }
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();
