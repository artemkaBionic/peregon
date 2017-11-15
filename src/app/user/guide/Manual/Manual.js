(function() {
    'use strict';

    angular.module('app.user').controller('GuideControllerManual', GuideControllerManual);

    GuideControllerManual.$inject = ['item', '$state', 'popupLauncher', '$scope', 'sessionsService'];

    function GuideControllerManual(item, $state, popupLauncher, $scope, sessions) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.session = {};
        vm.showInstruction = true;
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        vm.steps = {
            checkCondition: {
                name: 'checkCondition',
                number: 1,
                title: 'Check condition'
            },
            refreshDevice: {
                name: 'refreshDevice',
                number: 2,
                title: 'Refresh the Device'
            },
            complete: {
                name: 'complete',
                number: 3,
                title: 'Refresh is Complete'
            },
            failed: {
                name: 'failed',
                number: 4,
                title: 'Refresh Failed'
            },
            broken: {
                name: 'broken',
                number: 5,
                title: 'Device Broken'
            }
        };

        function setStep(step) {
            vm.step = step;
            return sessions.updateCurrentStep(vm.session._id, step.name);
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

        vm.deviceGood = function() {
            setStep(vm.steps.refreshDevice);
        };
        vm.deviceBad = function() {
            setStep(vm.steps.broken).then(function() {
                return sessions.addLogEntry(vm.session._id, 'Info', 'Device is broken', '');
            }).then(function() {
                return sessions.finish(vm.session._id, {'complete': false});
            });
        };
        $scope.$on('refreshSuccess', function() {
            setStep(vm.steps.complete).then(function() {
                return sessions.finish(vm.session._id, {'complete': true});
            });
        });
        $scope.$on('refreshFailed', function() {
            setStep(vm.steps.failed).then(function() {
                return sessions.finish(vm.session._id, {'complete': false});
            });
        });
        vm.retry = function() {
            checkSession();
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();
