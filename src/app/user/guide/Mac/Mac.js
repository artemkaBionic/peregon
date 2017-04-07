(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerMac', GuideControllerMac);

    GuideControllerMac.$inject = ['$q', '$scope', 'config', 'item', 'inventoryService', '$state'];

    function GuideControllerMac($q, $scope, config, item, inventoryService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.step = null;
        vm.guideUrl = config.guidesPath + '/Mac/' + config.guidesIndexFile;
        vm.ready = false;
        vm.success = false;
        vm.finished = false;

        vm.steps = {
            start: {
                name: 'start',
                number: 1,
                title: 'Refresh Device'
            },
            finishSuccess: {
                name: 'finishSuccess',
                number: 2,
                title: 'Successfully refurbished'
            },
            finishFail: {
                name: 'finishFail',
                number: 3,
                title: 'Refresh failed.'
            }
        };

        $scope.$on('$destroy', function() {
            if (!vm.finished) {
                vm.finishClosed();
            }
        });

        activate();
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            vm.step = vm.steps.start;

            var queries = [inventoryService.startSession(item)];
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

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
