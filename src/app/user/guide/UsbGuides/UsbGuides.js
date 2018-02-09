(function() {
    'use strict';

    angular.module('app.user').controller('GuideControllerUsb', GuideControllerUsb);

    GuideControllerUsb.$inject = [
        '$scope',
        'item',
        'sessionsService',
        '$state',
        'socketService',
        'popupLauncher'];

    function GuideControllerUsb($scope, item, sessions, $state, socket, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.sessionId = null;
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
                number: 6,
                title: 'Refresh Failed'
            },
            broken: {
                name: 'broken',
                number: 7,
                title: 'Device Broken'
            }
        };

        function setStep(step) {
            return sessions.updateCurrentStep(vm.sessionId, step.name);
        }

        vm.sessionExpired = function() {
            setStep(vm.steps.broken);
        };

        vm.finishFail = function() {
            setStep(vm.steps.failed);
        };

        vm.finishSuccess = function() {
            setStep(vm.steps.complete);
        };
        vm.openFeedbackModal = function() {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
        checkSession();

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

        function updateSession(session) {
            if (vm.sessionId === null) {
                vm.sessionId = session._id;
            }
            if (session.status === 'Success') {
                vm.step = vm.steps.complete;
            } else if (session.status === 'Incomplete') {
                vm.step = vm.steps[session.tmp.currentStep];
            } else {
                vm.step = vm.steps.failed;
            }
        }

        vm.startSession = function() {
            return setStep(vm.steps.usbControl);
        };
        vm.deviceBad = function() {
            return sessions.addLogEntry(vm.sessionId, 'Info', 'Device is broken', '').then(function() {
                return sessions.finish(vm.sessionId, {'complete': false, 'reason': 'Broken'});
            });
        };

        $scope.$on('bootDevicesReady', function() {
            refreshDevicesStart();
        });

        function refreshDevicesStart() {
            setStep(vm.steps.refreshDevice);
            sessions.addLogEntry(vm.sessionId, 'Info', 'Refresh Started', '');
        }

        socket.on('session-updated', function(session) {
            if (session._id === vm.sessionId) {
                updateSession(session);
            }
        });
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();
