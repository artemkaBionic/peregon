(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerManual', GuideControllerManual);

    GuideControllerManual.$inject = ['item', '$state', 'popupLauncher','$scope'];

    function GuideControllerManual(item, $state, popupLauncher, $scope) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.showInstruction = true;
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        vm.steps = {
            prepare: {
                name: 'prepare',
                number: 1,
                title: 'Prepare Refresh'
            },
            refresh: {
                name: 'refresh',
                number: 2,
                title: 'Refresh Device'
            }
        };
        vm.substeps = {
            checkCondition: {
                name: 'checkCondition',
                number: 0,
                title: 'Check Condition'
            },
            refreshSuccess: {
                name: 'refreshSuccess',
                number: 1,
                title: 'Refresh Success'
            },
            refreshFailed: {
                name: 'rerfeshFailed',
                number: 2,
                title: 'Refresh Failed'
            },
            deviceBroken: {
                name: 'deviceBroken',
                number: 3,
                title: 'Device Broken'
            },
            instruction: {
                name: 'instruction',
                number: 4,
                title: 'Instruction'
            }
        };
        vm.step = vm.steps.prepare;
        vm.substep = vm.substeps.checkCondition;
        vm.deviceGood = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.instruction;
        };
        vm.openFeedbackModal = function(){
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
        vm.deviceBad = function() {
            vm.substep = vm.substeps.deviceBroken;
        };
        $scope.$on('refreshSuccess',function(){
            vm.refreshSuccess();
        });
        $scope.$on('refreshFailed',function(){
            vm.refreshFailed();
        });
        vm.refreshSuccess = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.refreshSuccess;
        };
        vm.refreshFailed = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.refreshFailed;
        };
        vm.retry = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.checkCondition;
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
    }
})();

