(function() {
    'use strict';

    angular.module('app.user').
        controller('GuideControllerWindows', GuideControllerWindows);

    GuideControllerWindows.$inject = [
        '$q',
        'config',
        'item',
        'sessionsService',
        '$state',
        'socketService',
        'popupLauncher'];

    function GuideControllerWindows($q, config, item, sessions, $state, socket, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.sessionId = null;
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
            complete: {
                name: 'complete',
                number: 3,
                title: 'Refresh Complete'
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
        vm.step = vm.steps.checkCondition;
        activate();

        function activate() {
            sessions.getIncomplete(vm.item.item_number).then(function(session) {
                updateSession(session);
            });
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

        vm.openFeedbackModal = function() {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };

        function updateSession(session) {
            if (session && (session._id === vm.sessionId ||
                    (vm.sessionId === null && session.device.item_number === vm.item.item_number))) {
                if (vm.sessionId === null) {
                    vm.sessionId = session._id;
                }
                if (session.status === 'Success') {
                    vm.step = vm.steps.complete;
                } else if (session.status === 'Incomplete') {
                    vm.step = vm.steps.beginRefresh;
                } else {
                    if (vm.step !== vm.steps.broken) {
                        vm.step = vm.steps.failed;
                    }
                }
            }
        }

        vm.deviceGood = function() {
            vm.step = vm.steps.beginRefresh;
        };
        vm.deviceBad = function() {
            vm.androidFinished = true;
            vm.Broken = true;
            sessions.deviceBroken(item);
            vm.step = vm.steps.broken;
        };
        vm.retry = function() {
            vm.sessionId = null;
            vm.step = vm.steps.beginRefresh;
        };
        vm.goHome = function() {
            $state.go('root.user');
        };

        socket.on('session-updated', function(session) {
            updateSession(session);
        });
    }
})();
