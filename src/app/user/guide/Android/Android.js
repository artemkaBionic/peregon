(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerAndroid', GuideControllerAndroid);

    GuideControllerAndroid.$inject = ['$q', '$scope', 'config', 'socketService', '$state', 'popupLauncher', 'toastr', '$timeout', 'inventoryService', 'item', 'eventService'];

    function GuideControllerAndroid($q, $scope, config, socketService, $state, popupLauncher, toastr, $timeout, inventoryService, item, eventService) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
        vm.item = item;
        vm.step = null;
        eventService.AndroidGuideInProcess = true;
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
            vm.step = vm.steps.startOne; //!!! Definition for first Guide Step
            vm.sessionDate =  new Date().toISOString();
            if (eventService.InternetConnection) {
                toastr.clear(eventService.connectionNotification);
            }
            unlockDevice(vm.item.InventoryNumber);
        };

        function unlockDevice() {
            if (vm.item) {
                inventoryService.unlock(vm.item.InventoryNumber).then(function(data) {
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
                inventoryService.lock(vm.item.InventoryNumber);
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
            diagnosticOne: {
                name: 'diagnosticOne',
                number: 7,
                title: 'Automatic Diagnostics'
            },
            diagnosticTwo: {
                name: 'diagnosticTwo',
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
        checkSession();
        // jscs:disable
        function checkSession() {
            inventoryService.checkSession(item)
                .then(function(res) {
                    if (res.session_id) {
                        inventoryService.getSession(res.session_id)
                            .then(function(reponse){
                                if (reponse.currentStep === 'Auto passed') {
                                    vm.step = vm.steps.diagnosticOne;

                                } else if(reponse.currentStep === 'Manual Testing') {
                                    vm.step = vm.steps.diagnosticTwo;
                                }
                                vm.manualPassed = reponse.device.passed_manual;
                                vm.manualSize = reponse.device.number_of_manual;
                                vm.autoSize = reponse.device.number_of_auto;
                                vm.autoPassed = reponse.device.passed_auto;
                            })
                    }
                });
        }


        socketService.on('android-session-expired', function(data) {
            if ($state.current.name === 'root.user.guide') {
                inventoryService.checkSession(item)
                    .then(function (res) {
                        if (res.session_id === data.sessionId) {
                            vm.sessionExpired();
                            toastr.warning('Session expired for device:' + data.device, {
                                'tapToDismiss': true,
                                'timeOut': 3000,
                                'closeButton': true
                            });
                        }
                    });
            }
        });
        // jscs: enable
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

        vm.diagnosticOne = function() {
            //vm.autoPassed = 0;
            vm.step = vm.steps.diagnosticOne;
            doesAppStarted();
        };

        vm.diagnosticTwo = function() {
            vm.manualPassed = 0;
            vm.step = vm.steps.diagnosticTwo;
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

        vm.finishClosed = function() {
            lockDevice();
        };

        vm.finish = function() {
            eventService.AndroidGuideInProcess = false;
            vm.androidFinished = true;
            if (vm.TestsFault || vm.Broken || vm.AndroidDisconnected) {
                inventoryService.startAndroidSession(vm.sessionDate, item)
                    .then(inventoryService.updateSession(vm.sessionDate, 'Info', 'Device is broken'))
                        .then(inventoryService.finishSession(vm.sessionDate, {'complete': false}));
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

        /*============================End Preparation====================*/
        /*=================Diagnostics=================*/

        function actionManual() {
            if (vm.manualPassed === vm.manualSize) {
                timeouts.push($timeout(makeActionManual, 1500));
            }
        }

        function makeActionManual() {
            vm.manualShowLastAction = true;
        }

        function makeAppNotStarted() {
            if (vm.autoPassed === 0) {
                vm.AppNotStarted = true;
            }
        }

        function doesAppStarted() {
            timeouts.push($timeout(makeAppNotStarted, 30000));
        }

        /*=================End Diagnostics=================*/
        /*=================Diagnostics Orbicular Progress Bar Definition=================*/

        function progressAuto() {
            vm.manualPassed = 0;// Reset The amount of passed steps
            if (vm.step === vm.steps.diagnosticOne) {
                vm.autoPassed += 1;
                if (vm.autoPassed === vm.autoSize) {
                    timeouts.push($timeout(vm.diagnosticTwo, 1000));
                }
            }
        }

        function progressManual() {
            vm.autoPassed = 0;// Reset The amount of passed steps
            if (vm.step === vm.steps.diagnosticTwo) {
                vm.manualPassed += 1;
                actionManual();
            }
        }

        /*=================End Diagnostics Orbicular Progress Bar Definition=================*/
        /*=================USB Connect end Events===============*/
        waitForAndroidAdd();//Event listener

        function waitForAndroidAdd() {
                socketService.on('android-add', function() {
                    if ($state.current.name === 'root.user.guide') {
                        //inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Android device connected.');
                        vm.AndroidDisconnected = false;
                        toastr.clear(vm.AndroidNotification);
                        vm.AndroidNotification = toastr.info('Follow the instructions on the Android Device', 'Android Device Connected', {
                            'tapToDismiss': true,
                            'timeOut': 3000,
                            'closeButton': true
                        });//Toast Pop-Up notification parameters
                        if (vm.androidFinished) {
                            return;
                        } else {
                            waitForAppStart();
                        }
                    }
                });
                socketService.on('android-remove', function() {
                    if ($state.current.name === 'root.user.guide') {
                        toastr.clear(vm.AndroidNotification);
                        if (vm.androidFinished) {
                            vm.AndroidNotification = toastr.info('Refresh completed', 'Android Device has been Disconnected', {
                                'tapToDismiss': true,
                                'timeOut': 3000,
                                'closeButton': true
                            });//Toast Pop-Up notification parameters
                        } else {
                            vm.AndroidDisconnected = true;
                            vm.AndroidConnectionDoubleCheck();
                        }
                    }
                });

                socketService.on('app-start', function(data) {
                    if ($state.current.name === 'root.user.guide') {
                        vm.autoSize = data.data.auto;//Get number of Auto tests
                        vm.manualSize = data.data.manual;//Get number of Manual tests
                        vm.refreshAppStarted = true;
                        if (vm.step === vm.steps.waitForAppStart) {
                            vm.diagnosticOne();
                        }
                    }
                });

                socketService.on('android-test', function(data) {
                    if ($state.current.name === 'root.user.guide') {
                        if (data.passed === false) {
                            vm.TestsFault = true;//If one of the Auto tests Fails
                        }

                        if (data.type === 1) {
                            if (vm.step !== vm.steps.diagnosticOne) {
                                vm.diagnosticOne();//Starting Auto diagnostic from the beginning
                            } // Phone can be connected even on the first Step, if lazy associate
                            progressAuto();
                        }
                        if (data.type === 0) {
                            if (vm.step !== vm.steps.diagnosticTwo) {
                                vm.diagnosticTwo();//Starting Manual diagnostic from the beginning
                            }
                            progressManual();
                        }
                    }
                });

                socketService.on('android-reset', function(data) {
                    if ($state.current.name === 'root.user.guide') {
                        // jscs:disable
                        vm.failedTests = data.failed_tests;
                        if (vm.failedTests.length > 0) {
                            vm.TestsFault = true;
                        }
                        // jscs:enable
                        vm.finish();
                    }
                });
        }

        /*=================End USB Connect end Events===============*/
        /*=================Android Disconnected Actions===============*/
        vm.AndroidConnectionDoubleCheck = function() {
            if (vm.AndroidDisconnected) {
                vm.TestsFault = true;
                vm.finish();
            }
        };
        vm.TestsFault = true;
        vm.activate();
        /*=================Android Disconnected Actions===============*/
    }
})();
