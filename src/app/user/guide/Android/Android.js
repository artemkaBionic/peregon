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
        'item',
        'env'];

    function GuideControllerAndroid($scope, $state, popupLauncher, toastr,
                                    $timeout, inventoryService, item, env) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
        var socket = io.connect('http://' + env.baseUrl);
        vm.item = item;
        vm.step = null;
        /*=================Checking for Android Refresh process finished to lock the device===============*/
        $scope.$on('$destroy', function() {
            vm.finishClosed();
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
            vm.refreshAppStarted = false;
            vm.PowerGood = false;
            vm.ExternalGood = false;
            vm.ButtonsGood = false;
            vm.Broken = false; //The reason for the transition to the Fail finish
            vm.NotLocked = false;
            //vm.NotConnected = false;
            vm.Wifi = false;
            vm.UsbDebug = false;
            vm.buttonBackShow = false; //If Checkboxes passed but device not connected
            vm.TestsFault = false; // The reason for the transition to the Fail finish
            vm.manualShowLastAction = false; //After tests end hides Orbicular Progress Bar and show complete message
            vm.AppNotStarted = false; // Reconnect - if connected but Application fails to start
            vm.autoSize = 0;
            vm.manualSize = 0;
            vm.autoPassed = 0;
            vm.manualPassed = 0;
            vm.failedTests = [];
            vm.sessionId = null;
            console.log(vm.sessionId);
            vm.step = vm.steps.startOne; //!!! Definition for first Guide Step

            inventoryService.getSessionByParams({
                'device.item_number': vm.item.InventoryNumber,
                'status': 'Incomplete'
            }).then(function(session) {
                updateSession(session);
            });
            unlockDevice();
        };

        function unlockDevice() {
            if (vm.item) {
                inventoryService.unlock(vm.item.Serial, false).
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
                inventoryService.lock(vm.item.Serial);
            }
        }

        /*=================End Device lock and unlock functions ==============*/
        /*=================Guide Steps definition===============*/
        vm.steps = {
            startOne: {
                name: 'startOne',
                number: 1,
                title: 'Inspect Device'
            },
            startTwo: {
                name: 'startTwo',
                number: 2,
                title: 'Check Battery'
            },
            waitForUnlock: {
                name: 'waitForUnlock',
                number: 3,
                title: 'Initializing'
            },
            preparationOne: {
                name: 'preparationOne',
                number: 4,
                title: 'Prepare Device'
            },
            preparationFour: {
                name: 'preparationFour',
                number: 5,
                title: 'Connect Device'
            },
            waitForAppStart: {
                name: 'waitForAppStart',
                number: 6,
                title: 'Loading'
            },
            autoTesting: {
                name: 'autoTesting',
                number: 7,
                title: 'Automatic Diagnostics'
            },
            manualTesting: {
                name: 'manualTesting',
                number: 8,
                title: 'Manual Diagnostics'
            },
            finishSuccess: {
                name: 'finishSuccess',
                number: 9,
                title: 'Successfully refurbished'
            },
            finishFail: {
                name: 'finishFail',
                number: 10,
                title: 'Refresh failed.'
            },
            sessionExpired: {
                name: 'sessionExpired',
                number: 11,
                title: 'Session Expired'
            }
        };
        /*================= End Guide Steps definition===============*/
        /*================= Modal Tips Steps definition===============*/
        vm.ModalSteps = {
            connect: {
                name: 'connect',
                number: 1,
                title: 'Connect to WiFi'
            },
            connectSiperlock: {
                name: 'connectSiperlock',
                number: 1,
                title: 'Connect to WiFi and Restart Device'
            },
            connectWsa: {
                name: 'connectWsa',
                number: 1,
                title: 'Connect to WiFi'
            },
            unlock: {
                name: 'unlock',
                number: 2,
                title: 'Disable any Android locks'
            },
            /*googleAccount: {
             name: 'googleAccount',
             number: 3,
             title: 'Remove Google account'
             },*/
            usbDebug: {
                name: 'usbDebug',
                number: 4,
                title: 'Enable USB Debugging'
            }
        };

        /*================= End Modal Tips Steps definition===============*/
        function updateSession(session) {
            // jscs:disable
            console.log('here');
            if (session && (session._id === vm.sessionId ||
                    (vm.sessionId === null && session.status === 'Incomplete' &&
                        session.device.item_number ===
                        vm.item.InventoryNumber))) {
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
                // // jscs: enable
            }
        }

        vm.openModal = function(modalSize) {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Android/Guide-modal.html',
                controller: 'AndroidModalController',
                bindToController: true,
                controllerAs: 'vm',
                resolve: {ModalStep: vm.ModalStep},
                size: modalSize
            });
        }; // Android Modal window preferences

        /*=================Guide Steps functions===============*/
        vm.startTwo = function() {
            vm.step = vm.steps.startTwo;
        };

        function waitForUnlock() {
            if (vm.deviceLockServiceUnlocked) {
                vm.step = vm.steps.preparationOne;
            } else {
                vm.step = vm.steps.waitForUnlock;
            }
        }

        vm.preparationOne = function() {
            vm.NotLocked = false;
            //vm.NotConnected = false;
            vm.Wifi = false;
            vm.UsbDebug = false;
            vm.step = vm.steps.preparationOne;
        };

        vm.preparationFour = function() {
            vm.buttonBackShow = false;
            vm.step = vm.steps.preparationFour;
            timeouts.push($timeout(vm.buttonBack, 20000));
        };

        function waitForAppStart() {
            if (vm.refreshAppStarted) {
                vm.diagnosticOne();
            } else {
                vm.step = vm.steps.waitForAppStart;
            }
        }
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

        vm.finishClosed = function() {
            lockDevice();
        };

        vm.finish = function() {
            vm.androidFinished = true;
            if (vm.Broken) {
                if (vm.sessionId === null) {
                    vm.sessionId = new Date().toISOString();
                }
                inventoryService.startSession(vm.sessionId, item).
                    then(function(session){
                        inventoryService.updateSession(session, 'Info',
                            'Device is broken').then(function(session) {
                            inventoryService.finishSession(session._id, {'complete': false});
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
        vm.ModalStep = null;
        // Android Modal Window Steps Functions
        vm.modalConnect = function() {
            if (vm.deviceLockService === 'siperlock') {
                vm.ModalStep = vm.ModalSteps.connectSiperlock;
            } else if (vm.deviceLockService === 'wsa') {
                vm.ModalStep = vm.ModalSteps.connectWsa;
            } else {
                vm.ModalStep = vm.ModalSteps.connect;
            }
            vm.openModal('lg');
        };
        vm.modalUnlock = function() {
            vm.ModalStep = vm.ModalSteps.unlock;
            vm.openModal('lg');
        };
        /*vm.modalGoogleAccount = function() {
         vm.ModalStep = vm.ModalSteps.googleAccount;
         vm.openModal('lg');
         };*/
        vm.modalUsbDebug = function() {
            vm.ModalStep = vm.ModalSteps.usbDebug;
            vm.openModal('lg');
        };

        /*=================End Modal Tips Steps functions===============*/
        /*=================startOne - Inspection & StartTwo - Check battery===============*/

        vm.startResult = function() {
            if (!vm.ExternalGood) {
                // Exterior Check
                vm.Broken = true;
                vm.finish();
            } else if (!vm.PowerGood) {
                // Check the Battery
                vm.startTwo();
            } else if (!vm.ButtonsGood) {
                // Screen & Buttons
                vm.Broken = true;
                vm.finish();
            } else {
                //All Good, Continue to the next step
                waitForUnlock();
            }
        };

        vm.notTurnOn = function() {
            vm.Broken = true;
            vm.finish();
        };

        vm.startResultLast = function() {
            timeouts.push($timeout(vm.startResult, 500));
        };

        vm.deviceTurnsOn = function() {
            vm.PowerGood = true;
            waitForUnlock();
        };
        /*=================End StartOne - Inspection & StartTwo - Check battery===============*/
        /*=================Preparation===============*/

        vm.startPreparation = function() {
            if (vm.NotLocked && vm.Wifi && vm.UsbDebug) {
                timeouts.push($timeout(vm.preparationFour, 500));
            }
        }; // Preparation Toggles function

        vm.buttonBack = function() {
            vm.buttonBackShow = true;
        };

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
                waitForAppStart();
            }
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
