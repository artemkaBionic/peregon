(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerMac', GuideControllerMac);

    GuideControllerMac.$inject = ['$q', '$scope', 'config', 'item', 'inventoryService', '$state', '$timeout'];

    function GuideControllerMac($q, $scope, config, item, inventoryService, $state, $timeout) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.step = null;
        vm.guideUrl = config.guidesPath + '/Mac/' + config.guidesIndexFile;
        vm.ready = false;
        vm.success = false;
        vm.finished = false;
        //vm.nextStep = nextStep;
        //vm.previousStep = previousStep;
        vm.steps = {
            prepare: {
                name: 'prepareUSBdrive',
                number: 1,
                title: 'Prepare USB drive'
            },
            refresh: {
                name: 'refreshMac',
                number: 2,
                title: 'Refresh MAC'
            },
            finish: {
                name: 'checkStatus',
                number: 3,
                title: 'Check status.'
            }
        };
        vm.substeps = {
            insertUsbToStation: {
                name: 'insertUsbToStation',
                number: 1,
                title: 'Insert USB To Station'
            },
            usbLoading: {
                name: 'usbLoading',
                number: 2,
                title: 'Insert USB To Station'
            }
        };
        $scope.$on('$destroy', function() {
            if (!vm.finished) {
                vm.finishClosed();
            }
        });
        vm.step = vm.steps.prepare;
        activate();
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.insertUsbToStation;
            var queries = [inventoryService.startSession(item)];
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
        vm.count = 0;
        vm.percentageComplete = 0;
        for (var i = 0; i < 4; i++) {
            vm.count += 1;
            vm.percentageComplete = vm.count / 4 * 100;
        }
        vm.nextSubstep = function() {
            vm.substep.number++;
        };
        vm.previousSubstep = function() {
            vm.substep.number--;
        };
        vm.nextStep = function() {
            vm.step.number++;
        };
        vm.previousStep = function() {
            vm.step.number--;
        };
        vm.retry = function() {
            vm.step.number = 1;
            vm.substep.number = 1;
        };
        vm.finishFail = function() {
            vm.step = vm.steps.finishFail;
            return inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session failed.')
                .then(function() {
                    return inventoryService.finishSession(vm.item.InventoryNumber, {'complete': false});
                });
        };

        vm.finishSuccess = function() {
            vm.step = vm.steps.finishSuccess;
            return inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Session complete.')
                .then(function() {
                    return inventoryService.finishSession(vm.item.InventoryNumber, {'complete': true});
                });
        };

        vm.finishClosed = function() {
            return inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'User closed refresh session.')
                .then(function() {
                    return inventoryService.finishSession(vm.item.InventoryNumber, {'complete': false});
                });
        };

        vm.finish = function() {
            vm.finished = true;
            if (vm.success) {
                vm.finishSuccess();
            }
            else {
                vm.finishFail();
            }
        };
    }
})();
