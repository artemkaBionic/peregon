(function() {
    'use strict';

    angular.module('app.user').
        controller('GuideControllerWindows', GuideControllerWindows);

    GuideControllerWindows.$inject = ['$q', 'config', 'item', 'sessionsService', '$state', 'socketService', 'popupLauncher'];

    function GuideControllerWindows($q, config, item, sessions, $state, socket, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.session = {};
        vm.isSkuGuideAvailable = null;

        vm.skuGuideUrl = config.skuGuidesPath + '/' + item.sku + '/' + config.skuGuidesIndexFile;

        vm.steps = {
            checkCondition: {
                name: 'checkCondition',
                number: 1,
                title: 'Check condition'
            },
            beginRefresh: {
                name: 'beginRefresh',
                number: 2,
                title: 'Begin Refresh'
            },
            refreshInProgress: {
                name: 'refreshInProgress',
                number: 3,
                title: 'Refresh in Progress'
            },
            complete: {
                name: 'complete',
                number: 4,
                title: 'Refresh Complete'
            },
            failed: {
                name: 'failed',
                number: 5,
                title: 'Refresh Failed'
            },
            broken: {
                name: 'broken',
                number: 6,
                title: 'Device Broken'
            }
        };
        activate();

        function activate() {
            checkIsSkuGuideAvailable();
        }

        function checkIsSkuGuideAvailable() {
            var request = new XMLHttpRequest();
            request.open('HEAD', vm.skuGuideUrl, false);
            request.send();
            if (request.status === 200) {
                vm.isSkuGuideAvailable = true;
            } else {
                vm.isSkuGuideAvailable = false;
            }
        }

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
                if (vm.step !== vm.steps.broken) {
                    vm.step = vm.steps.failed;
                }
            }
        }

        vm.startSession = function() {
            setStep(vm.steps.beginRefresh);
        };
        vm.deviceBad = function() {
            setStep(vm.steps.broken).then(function() {
                return sessions.addLogEntry(vm.session._id, 'Info', 'Device is broken', '');
            }).then(function() {
                return sessions.finish(vm.session._id, {'complete': false});
            });
        };

        socket.on('session-updated', function(session) {
            updateSession(session);
        });
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
