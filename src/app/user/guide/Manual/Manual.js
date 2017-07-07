(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerManual', GuideControllerManual);

    GuideControllerManual.$inject = ['item', '$state'];

    function GuideControllerManual(item, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
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
            },
            finish: {
                name: 'checkStatus',
                number: 3,
                title: 'Check status.'
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
            }
        };
        vm.step = vm.steps.prepare;
        vm.substep = vm.substeps.checkCondition;
        vm.deviceGood = function () {
            vm.step = vm.steps.refresh;
        };
        vm.deviceBad = function () {
            vm.substep = vm.substeps.deviceBroken;
        };
        vm.refreshSuccess = function () {
            vm.step = vm.steps.finish;
            vm.substep = vm.substeps.refreshSuccess;
        };
        vm.refreshFailed = function () {
            vm.step = vm.steps.finish;
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

