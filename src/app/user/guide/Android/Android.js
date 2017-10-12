(function() {
    'use strict';

    angular.module('app.user').
        controller('GuideControllerAndroid', GuideControllerAndroid);

    GuideControllerAndroid.$inject = [
        '$scope',
        '$state',
        'popupLauncher',
        'toastr',
        '$timeout',
        'inventoryService',
        'sessionsService',
        'item',
        'env'];

    function GuideControllerAndroid($scope, $state, popupLauncher, toastr,
                                    $timeout, inventoryService, sessionsService, item, env) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
        var socket = io.connect('http://' + env.baseUrl);
        vm.item = item;
        vm.step = null;
        /*=================Checking for Android Refresh process finished to lock the device===============*/
        $scope.$on('$destroy', function() {
            timeouts.forEach(function(timeout) {
                $timeout.cancel(timeout);
            });
        });//'$destroy' event appears just before the destruction of the controller
        /*=================End Checking for Android Refresh process finished to lock the device===============*/
        /*================= Device lock and unlock functions ==============*/
        vm.activate = function() {
            vm.androidFinished = false;//Gonna be 'true' when finish
            vm.deviceLockService = 'none';
            vm.AndroidDisconnected = false;
            vm.deviceLockServiceUnlocked = false;
            vm.Broken = false; //The reason for the transition to the Fail finish
            vm.NotLocked = false;
            //vm.NotConnected = false;
            vm.buttonBackShow = false; //If Checkboxes passed but device not connected
            vm.TestsFault = false; // The reason for the transition to the Fail finish
            vm.manualShowLastAction = false; //After tests end hides Orbicular Progress Bar and show complete message
            vm.autoSize = 0;
            vm.manualSize = 0;
            vm.autoPassed = 0;
            vm.manualPassed = 0;
            vm.failedTests = [];
            vm.sessionId = null;
            vm.step = vm.steps.startOne; //!!! Definition for first Guide Step

            sessionsService.getSessionByParams({
                'device.item_number': vm.item.item_number,
                'status': 'Incomplete'
            }).then(function(session) {
                updateSession(session);
            });
            unlockDevice();
        };

        function unlockDevice() {
            if (vm.item) {
                inventoryService.unlock(vm.item.serial_number, false).
                    then(function(data) {
                        if (!data.error) {
                            vm.deviceLockService = data.result.service;
                            vm.deviceLockServiceUnlocked = true;
                            if (vm.step === vm.steps.waitForUnlock) {
                                vm.step = vm.steps.preparationOne;
                            }
                        }
                    });
            }
        }

        function lockDevice() {
            if (vm.item) {
                inventoryService.lock(vm.item.serial_number);
            }
        }
        vm.openFeedbackModal = function(){
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
        /*=================End Device lock and unlock functions ==============*/
        /*=================Guide Steps definition===============*/
        vm.steps = {
            startOne: {
                name: 'startOne',
                number: 1,
                title: 'Inspect Device'
            },
            preparationOne: {
                name: 'preparationOne',
                number: 2,
                title: 'Prepare Device'
            },
            enableYesButton: {
                name: 'enableYesButton',
                number: 3,
                title: 'Click Yes on phone screen'
            },
            waitForAppStart: {
                name: 'waitForAppStart',
                number: 4,
                title: 'Loading'
            },
            autoTesting: {
                name: 'autoTesting',
                number: 5,
                title: 'Automatic Diagnostics'
            },
            manualTesting: {
                name: 'manualTesting',
                number: 6,
                title: 'Manual Diagnostics'
            },
            finishSuccess: {
                name: 'finishSuccess',
                number: 7,
                title: 'Successfully refurbished'
            },
            finishFail: {
                name: 'finishFail',
                number: 8,
                title: 'Refresh failed.'
            },
            sessionExpired: {
                name: 'sessionExpired',
                number: 9,
                title: 'Session Expired'
            }
        };
        /*================= End Modal Tips Steps definition===============*/
        function updateSession(session) {
            console.log(session);
            if (session && (session._id === vm.sessionId ||
                    (vm.sessionId === null && session.status === 'Incomplete' &&
                        session.device.item_number ===
                        vm.item.item_number))) {
                    $scope.$evalAsync(function(){
                        if (vm.sessionId === null) {
                            vm.sessionId = session._id;
                        }
                        if (vm.steps[session.tmp.currentStep] !== undefined) {
                            vm.step = vm.steps[session.tmp.currentStep];
                        }
                        vm.failedTests = session.failedTests;
                        vm.autoSize = session.tmp.numberOfAuto;
                        vm.autoPassed = session.tmp.passedAuto;
                        vm.manualSize = session.tmp.numberOfManual;
                        vm.manualPassed = session.tmp.passedManual;
                    });
            }
        }
        /*=================Guide Steps functions===============*/
        vm.deviceGood = function() {
            vm.step = vm.steps.preparationOne;
        };
        vm.deviceBad = function() {
            vm.Broken = true;
            vm.finish();
        };
        vm.sessionExpired = function() {
            lockDevice();
            vm.step = vm.steps.sessionExpired;
        };

        vm.finishFail = function() {
            vm.step = vm.steps.finishFail;
        };

        vm.finishSuccess = function() {
            vm.step = vm.steps.finishSuccess;
        };

        vm.finish = function() {
            vm.androidFinished = true;
            if (vm.Broken) {
                if (vm.sessionId === null) {
                    vm.sessionId = new Date().toISOString();
                }
                sessionsService.start(vm.sessionId, item).
                    then(function(session){
                        sessionsService.addLogEntry(session._id, 'Info',
                            'Device is broken').then(function() {
                            sessionsService.finish(session._id, {'complete': false});
                        });
                    }
                );
                vm.finishFail();
            } else if (vm.TestsFault || vm.AndroidDisconnected) {
                vm.finishFail();
            } else {
                vm.finishSuccess();
            }
        };
        vm.refreshEnd = function() {
            vm.androidFinished = true;
            $state.go('root.user');
        }; // Finish Button - Go to the Home Screen
        /*=================End Guide Steps functions===============*/
        /*=================Modal Tips Steps functions===============*/
        vm.goHome = function() {
            $state.go('root.user');
        };
        function enableYesButton(){
            vm.step = vm.steps.enableYesButton;
        }
        socket.on('android-add', function() {
            vm.AndroidDisconnected = false;
            toastr.clear(vm.AndroidNotification);
            vm.AndroidNotification = toastr.info(
                'Follow the instructions on the Android Device',
                'Android Device Connected', {
                    'tapToDismiss': true,
                    'timeOut': 3000,
                    'closeButton': true
                });//Toast Pop-Up notification parameters
            if (vm.androidFinished) {
                return;
            } else {
                enableYesButton();
            }
        });
        socket.on('installation-started',function(){
            vm.step = vm.steps.waitForAppStart;
        });
        socket.on('android-remove', function() {
            toastr.clear(vm.AndroidNotification);
            if (vm.androidFinished) {
                vm.AndroidNotification = toastr.info(
                    'Refresh completed',
                    'Android Device has been Disconnected', {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });//Toast Pop-Up notification parameters
            } else {
                vm.AndroidDisconnected = true;
                vm.finish();
            }
        });

        socket.on('app-start', function(session) {
            updateSession(session);
        });

        socket.on('android-test', function(session) {
            updateSession(session);
        });

        socket.on('android-reset', function(session) {
            updateSession(session);
        });

        socket.on('android-session-expired', function(data) {
            if (vm.sessionId === data.sessionId) {
                vm.sessionExpired();
                toastr.warning('Session expired for device:' + data.device,
                    {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
            }
        });

        vm.activate();
    }
})();
