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
            usbControl: {
                name: 'usbControl',
                number: 2,
                title: 'Control of usb drives'
            },
            refreshDevice: {
                name: 'refreshDevice',
                number: 3,
                title: 'Refresh the Device'
            },
            verifyRefresh: {
                name: 'verifyRefresh',
                number: 4,
                title: 'Verify Refresh'
            },
            complete: {
                name: 'complete',
                number: 5,
                title: 'Refresh is Complete'
            },
            failed: {
                name: 'failed',
                number: 0,
                title: 'Refresh Failed'
            }
        };
        console.log(vm.item);
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
                    vm.step = vm.steps.usbControl;
                }
            } else {
                vm.step = vm.steps.failed;
            }
        }
        vm.startSession = function() {
            vm.sessionId = new Date().toISOString();
            inventoryService.startSession(vm.sessionId, item).then(function(session){
                vm.session = session;
               // checkUsbStatus();
                vm.step = vm.steps.usbControl;
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
        $scope.$on('bootDevicesReady', function(){
            refreshDevicesStart();
        });
        function refreshDevicesStart(){
            vm.step = vm.steps.refreshDevice;
            vm.session.tmp.currentStep = 'refreshStarted';
            inventoryService.updateSession(vm.session,'Info','Refresh Started','');
        }
        function refreshDevicesStarted() {
            vm.step = vm.steps.refreshDevice;
        }
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
