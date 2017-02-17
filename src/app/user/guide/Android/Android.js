(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerAndroid', GuideControllerAndroid);

    GuideControllerAndroid.$inject = ['$q', '$scope', 'socketService', '$state', 'popupLauncher', 'toastr', '$timeout', 'inventoryService', 'item', 'eventService'];

    function GuideControllerAndroid($q, $scope, socketService, $state, popupLauncher, toastr, $timeout, inventoryService, item, eventService) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
        vm.item = item;
        vm.step = null;
        eventService.AndroidGuideInProcess = true;
        /*=================Checking for Android Refresh process finished to lock the device===============*/
        $scope.$on('$destroy', function() {
            if (!vm.androidFinished) {
                lockDevice();
            }
            timeouts.forEach(function(timeout){
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

            if (eventService.InternetConnection){
                toastr.clear(eventService.connectionNotification);
            }

            timeouts.push($timeout(vm.sessionExpired,3600000)); //Session expires after an hour after the start
            var queries = [inventoryService.startSession('android', item), unlockDevice()];
            $q.all(queries);
        };

        function unlockDevice() {
            if (vm.item) {
                inventoryService.unlock(vm.item.Serial).then(function(data) {
                    if (data.error) {
                        inventoryService.updateSession('Unable to request device unlock.\n' + JSON.stringify(data.error, null, 2));
                    }
                    else {
                        vm.deviceLockService = data.result.service;
                        vm.deviceLockServiceUnlocked = true;
                        if (vm.step === vm.steps.waitForUnlock) {
                            vm.step = vm.steps.preparationOne;
                        }
                        inventoryService.updateSession('Device is unlocked by ' + vm.deviceLockService);
                    }
                });
            }
        }

        function lockDevice() {
            if (vm.item) {
                inventoryService.lock(vm.item.Serial).then(function(data) {
                    if (data.error) {
                        inventoryService.updateSession('Unable to request device lock.\n' + JSON.stringify(data.error, null, 2));
                    }
                    else {
                        inventoryService.updateSession('Device is locked by ' + vm.deviceLockService);
                    }
                });
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
            timeouts.push($timeout(vm.buttonBack,20000));
        };

        function waitForAppStart() {
            if (vm.refreshAppStarted) {
                vm.diagnosticOne();
            } else {
                vm.step = vm.steps.waitForAppStart;
            }
        }

        vm.diagnosticOne = function() {
            vm.autoPassed = 0;
            vm.step = vm.steps.diagnosticOne;
            doesAppStarted();
        };

        vm.diagnosticTwo = function() {
            vm.manualPassed = 0;
            vm.step = vm.steps.diagnosticTwo;
        };

        vm.sessionExpired = function() {
            lockDevice();
            inventoryService.updateSession('Session expired.');
            inventoryService.finishSession({'complete': false});
            vm.step = vm.steps.sessionExpired;
        };

        vm.finishFail = function() {
            lockDevice();
            inventoryService.updateSession('Session failed.');
            inventoryService.finishSession({'complete': false});
            vm.step = vm.steps.finishFail;
        };

        vm.finishSuccess = function() {
            lockDevice();
            inventoryService.updateSession('Session complete.');
            inventoryService.finishSession({'complete': true});
            vm.step = vm.steps.finishSuccess;
        };

        vm.finish = function() {
            eventService.AndroidGuideInProcess = false;
            vm.androidFinished = true;
            if (vm.TestsFault || vm.Broken || vm.AndroidDisconnected){
                vm.finishFail();
            }
            else {
                vm.finishSuccess();
            }
        };
        vm.refreshEnd = function() {
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
            var message =
                'Device inspection complete.\n' +
                'Screen and casing are in good condition: ' + vm.ExternalGood + '\n' +
                'Device turns on: ' + vm.PowerGood + '\n' +
                'Touch screen and buttons work: ' + vm.ButtonsGood;
            inventoryService.updateSession(message);

            if (!vm.ExternalGood) {
                // Exterior Check
                vm.Broken = true;
                vm.finish();
            }
            else if (!vm.PowerGood) {
                // Check the Battery
                vm.startTwo();
            }
            else if (!vm.ButtonsGood) {
                // Screen & Buttons
                vm.Broken = true;
                vm.finish();
            }
            else {
                //All Good, Continue to the next step
                waitForUnlock();
            }
        };

        vm.notTurnOn = function() {
            inventoryService.updateSession('After charging, the device still does NOT turn on.');
            vm.Broken = true;
            vm.finish();
        };

        vm.startResultLast = function() {
            timeouts.push($timeout(vm.startResult,500));
        };

        vm.deviceTurnsOn = function() {
            inventoryService.updateSession('After charging, the device turns on.');
            vm.PowerGood = true;
            waitForUnlock();
        };
        /*=================End StartOne - Inspection & StartTwo - Check battery===============*/
        /*=================Preparation===============*/

        vm.startPreparation = function() {
            if (vm.NotLocked && vm.Wifi && vm.UsbDebug) {
                timeouts.push($timeout(vm.preparationFour,500));
            }
        }; // Preparation Toggles function

        vm.buttonBack = function() {
            vm.buttonBackShow = true;
        };

        /*============================End Preparation====================*/
        /*=================Diagnostics=================*/

        function actionManual() {
            if (vm.manualPassed === vm.manualSize){
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
            timeouts.push($timeout(makeAppNotStarted,30000));
        }
        /*=================End Diagnostics=================*/
        /*=================Diagnostics Orbicular Progress Bar Definition=================*/

        function progressAuto() {
            vm.manualPassed = 0;// Reset The amount of passed steps
            if (vm.step === vm.steps.diagnosticOne){
                vm.autoPassed += 1;
                if (vm.autoPassed === vm.autoSize) {
                    timeouts.push($timeout(vm.diagnosticTwo,1000));
                }
            }
        }

        function progressManual() {
            vm.autoPassed = 0;// Reset The amount of passed steps
            if (vm.step === vm.steps.diagnosticTwo){
                vm.manualPassed += 1;
                actionManual();
            }
        }
        /*=================End Diagnostics Orbicular Progress Bar Definition=================*/
        /*=================USB Connect end Events===============*/
        waitForAndroidAdd();//Event listener
        function waitForAndroidAdd() {
            socketService.on('android-add', function() {

                    inventoryService.updateSession('Android device connected.');
                    vm.AndroidDisconnected = false;
                   toastr.clear(vm.AndroidNotification);
                    vm.AndroidNotification = toastr.info('Follow the instructions on the Android Device', 'Android Device Connected', {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });//Toast Pop-Up notification parameters
                    if (vm.androidFinished){
                        return;
                    }
                    else {
                        waitForAppStart();
                    }
            });
            socketService.on('android-remove', function() {
                    toastr.clear(vm.AndroidNotification);
                    if (vm.androidFinished){
                        vm.AndroidNotification = toastr.info('Refresh completed', 'Android Device has been Disconnected', {
                            'tapToDismiss': true,
                            'timeOut': 3000,
                            'closeButton': true
                        });//Toast Pop-Up notification parameters
                    } else {
                        vm.AndroidDisconnected = true;
                        inventoryService.updateSession('Android device has been disconnected.');
                        vm.AndroidConnectionCheck();
                        timeouts.push($timeout(vm.preparationFour,500));
                    }
            });

                socketService.on('app-start', function(data) {
                    inventoryService.updateSession('Android refresh app has started.');
                    vm.autoSize = data.data.auto;//Get number of Auto tests
                    vm.manualSize = data.data.manual;//Get number of Manual tests
                    vm.refreshAppStarted = true;
                    if (vm.step === vm.steps.waitForAppStart) {
                        vm.diagnosticOne();
                    }
                });

            socketService.on('android-test', function(data) {
                    var message = data.commandName + ' ' + (data.passed ? 'passed' : 'failed') + '\n' + JSON.stringify(data.data, null, 2);
                    inventoryService.updateSession(message);

                    if (data.passed === false) {
                        vm.TestsFault = true;//If one of the Auto tests Fails
                        vm.failedTests.push(data.commandName);
                    }

                    if (data.type === 1) {
                        if (vm.step !== vm.steps.diagnosticOne){
                            vm.diagnosticOne();//Starting Auto diagnostic from the beginning
                        } // Phone can be connected even on the first Step, if lazy associate
                        progressAuto();
                    }

                    if (data.type === 0) {
                        if (vm.step !== vm.steps.diagnosticTwo){
                            vm.diagnosticTwo();//Starting Manual diagnostic from the beginning
                        }
                        progressManual();
                    }
                });

            socketService.on('android-reset', function(data) {
                    inventoryService.updateSession('Android refresh app has initiated a factory reset.');
                    vm.finish();
            });
        }
        /*=================End USB Connect end Events===============*/
        /*=================Android Disconnected Actions===============*/
        vm.AndroidConnectionDoubleCheck = function() {
            if (vm.AndroidDisconnected){
                vm.TestsFault = true;
                vm.finish();
            }
        };
        vm.AndroidConnectionCheck = function() {
            vm.AndroidNotification = toastr.info('Connect the device to start over the diagnostics', 'Android Device has been Disconnected', {
                'tapToDismiss': true,
                'timeOut': 6000,
                'extendedTimeOut': 3000,
                'closeButton': true
            });
            //Toast Pop-Up notification parameters
            timeouts.push($timeout(vm.AndroidConnectionDoubleCheck,60000));
        };
        vm.TestsFault = true;
        vm.activate();
        /*=================Android Disconnected Actions===============*/
    }
})();
