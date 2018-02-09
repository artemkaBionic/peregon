(function() {
    'use strict';

    angular.module('app.user').controller('GuideControllerAndroid', GuideControllerAndroid);

    GuideControllerAndroid.$inject = [
        '$scope',
        '$state',
        'popupLauncher',
        'toastr',
        '$timeout',
        'inventoryService',
        'sessionsService',
        'socketService',
        'item'];

    function GuideControllerAndroid($scope, $state, popupLauncher, toastr,
                                    $timeout, inventory, sessions, socket, item) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
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
            vm.sessionId = null;
            vm.autoTestsTotal = 0;
            vm.autoTestsComplete = 0;
            vm.manualTestsTotal = 0;
            vm.manualTestsComplete = 0;
            vm.failedTests = [];
            vm.step = vm.steps.checkCondition; //!!! Definition for first Guide Step
            checkSession();
            unlockDevice();
        };

        function checkSession() {
            sessions.getIncomplete(vm.item.item_number).then(function(session) {
                if (session) {
                    updateSession(session);
                } else {
                    sessions.start(item, {'currentStep': 'checkCondition'}).then(function(session) {
                        updateSession(session);
                    });
                }
            });
        }

        function unlockDevice() {
            if (vm.item) {
                inventory.unlock(vm.item.serial_number, false);
            }
        }

        vm.openFeedbackModal = function() {
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
            checkCondition: {
                name: 'checkCondition',
                number: 1,
                title: 'Inspect Device'
            },
            prepareDevice: {
                name: 'prepareDevice',
                number: 2,
                title: 'Prepare Device'
            },
            authorizeDebug: {
                name: 'authorizeDebug',
                number: 3,
                title: 'Tap Yes or OK'
            },
            waitForAppStart: {
                name: 'waitForAppStart',
                number: 4,
                title: 'Loading'
            },
            appInstallFailed: {
                name: 'appInstallFailed',
                number: 5,
                title: 'App Install Failed.'
            },
            disconnected: {
                name: 'disconnected',
                number: 6,
                title: 'Disconnected'
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
                title: 'Successfully Refurbished'
            },
            finishFail: {
                name: 'finishFail',
                number: 10,
                title: 'Refresh Failed.'
            },
            finishExpired: {
                name: 'finishExpired',
                number: 11,
                title: 'Session Expired'
            },
            finishBroken: {
                name: 'finishBroken',
                nymber: 12,
                title: 'Device Broken'
            }
        };

        /*================= End Modal Tips Steps definition===============*/
        function updateSession(session) {
            if (session &&
                (session._id === vm.sessionId || (vm.sessionId === null && session.status === 'Incomplete'))) {
                $scope.$evalAsync(function() {
                    if (vm.sessionId === null) {
                        vm.sessionId = session._id;
                    }
                    if (session.tmp !== undefined) {
                        if (session.tmp.currentStep !== undefined && vm.steps[session.tmp.currentStep] !== undefined) {
                            vm.step = vm.steps[session.tmp.currentStep];
                        }
                        if (session.tmp.autoTestsTotal !== undefined) {
                            vm.autoTestsTotal = session.tmp.autoTestsTotal;
                        }
                        if (session.tmp.autoTestsComplete !== undefined) {
                            vm.autoTestsComplete = session.tmp.autoTestsComplete;
                        }
                        if (session.tmp.manualTestsTotal !== undefined) {
                            vm.manualTestsTotal = session.tmp.manualTestsTotal;
                        }
                        if (session.tmp.manualTestsComplete !== undefined) {
                            vm.manualTestsComplete = session.tmp.manualTestsComplete;
                        }
                    }
                    vm.failedTests = session.failed_tests;
                });
            }
        }

        /*=================Guide Steps functions===============*/
        function setStep(step) {
            return sessions.updateCurrentStep(vm.sessionId, step.name);
        }

        vm.deviceGood = function() {
            return setStep(vm.steps.prepareDevice);
        };
        vm.deviceBad = function() {
            return sessions.addLogEntry(vm.sessionId, 'Info', 'Device is broken', '').then(function() {
                return sessions.finish(vm.sessionId, {'complete': false, 'reason': 'Broken'});
            });
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        }; // Finish Button - Go to the Home Screen
        /*=================End Guide Steps functions===============*/
        /*=================Modal Tips Steps functions===============*/
        vm.goHome = function() {
            $state.go('root.user');
        };

        socket.on('installation-started', function() {
            vm.step = vm.steps.waitForAppStart;
        });
        socket.on('installation-failed', function(data) {
            vm.error = data.error;
            vm.step = vm.steps.appInstallFail;
        });

        socket.on('session-updated', function(session) {
            updateSession(session);
        });

        vm.activate();
    }
})();
