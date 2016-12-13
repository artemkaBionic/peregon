(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$q', '$state', 'config', '$http', 'inventoryService', '$uibModal', 'guideService', 'eventService', 'stationService'];

    function UserController($q, $state, config, $http, inventoryService, $uibModal, guideService, eventService, stationService) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        vm.searchString = '';
        vm.item = null;
        vm.guide = null;

        vm.searchStringChange = function() {
            if (config.itemNumberRegEx.test(vm.searchString)) {
                vm.item = null;
                inventoryService.getItem(vm.searchString).then(function(item) {
                    vm.item = item;
                    if (item.Sku) {
                        guideService.getGuide(item.Sku).then(function(guide) {
                            vm.guide = guide;
                        });
                    }
                });
            } else {
                vm.item = null;
            }
        };

        vm.showGuide = function() {
            if (vm.item !== null) {
                var $stateParams = {};
                $stateParams.itemNumber = vm.item.InventoryNumber;
                $state.go('root.user.guide', $stateParams);
                vm.searchString = null;
                vm.item = null;
            }
        };

        activate();

        function activate() {
            var queries = [loadData()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadData() {
        }
// Help Modal Window with Item Number

        if (vm.modalWindow) {
            vm.eventDispatcher.dispatch();
        }

        vm.eventDispatcher = {
            listen: function(callback) {
                this._callback = callback;
            },
            dispatch: function() {
                this._callback();
            }
        };
        vm.showItemNumber = function() {

            if (vm.modalWindow) {
                vm.modalWindow.dismiss();
            }
            vm.modalWindow = $uibModal.open({templateUrl: 'app/user/item_number/item_number.html',
                size: 'sm'
            });
        };
    }
})();
