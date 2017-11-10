(function() {
    'use strict';

    angular.module('app.user').
        controller('GuideControllerUsb', GuideControllerUsb);

    GuideControllerUsb.$inject = [
        '$scope',
        'item',
        'sessionsService',
        '$state',
        'socketService',
        'popupLauncher'];

    function GuideControllerUsb(
        $scope, item, sessions, $state, socket, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.selectedDevice = null;
        vm.refreshMediaPackage = null;
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
            vm.step = step;
            sessions.updateCurrentStep(vm.session._id, step.name);
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
            sessions.getSessionByParams({
                'device.item_number': vm.item.item_number,
                'status': 'Incomplete'
            }).then(function(session) {
                if (session) {
                    updateSession(session);
                } else {
                    var sessionId = new Date().toISOString();
                    sessions.start(sessionId, item, {'currentStep': 'checkCondition'}).then(function(session) {
                        updateSession(session);
                    });
                }
            });
        }

        function updateSession(session) {
            vm.session = session;
            if (vm.session.status === 'Success') {
                vm.step = vm.steps.complete;
            } else if (vm.session.status === 'Incomplete') {
                vm.step = vm.steps[session.tmp.currentStep];
            } else {
                vm.step = vm.steps.failed;
            }
        }

        vm.startSession = function() {
            setStep(vm.steps.usbControl);
        };
        vm.deviceBad = function() {
            setStep(vm.steps.broken).then(function(){
                return sessions.addLogEntry(vm.session._id, 'Info', 'Device is broken');
            }).then(function() {
                return sessions.finish(vm.session._id, {'complete': false});
            });
        };

        $scope.$on('bootDevicesReady', function() {
            refreshDevicesStart();
        });

        function refreshDevicesStart() {
            setStep(vm.steps.refreshDevice);
            vm.session.tmp.currentStep = 'refreshStarted';
            sessions.addLogEntry(vm.session._id, 'Info', 'Refresh Started', '');
        }

        socket.on('session-complete', function(session) {
            if (session._id === vm.session._id) {
                updateSession(session);
            }
        });
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();
