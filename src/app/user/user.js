(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$q', '$state', 'config', '$http', 'inventoryService', '$uibModal', 'guideService', 'socketService', 'stationService', 'eventService', '$scope'];

    function UserController($q, $state, config, $http, inventoryService, $uibModal, guideService, socketService, stationService, eventService, $scope) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        vm.searchString = '';
        vm.item = null;
        vm.guide = null;
        vm.AndroidEmei = null;
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
                vm.searchString = '';
                vm.item = null;
            }
        };

        vm.searchStringCheck = function() {
            if (vm.searchString != null)
                return vm.searchString
        };

        $scope.$watch(vm.searchStringCheck, vm.searchStringChange);

        activate();

        //=========== Start Working on catching the Android Connect before ItemNumber entered==========
        socketService.on('app-start', function(data) {
                // if (!eventService.AndroidGuideInProcess) {
                //    // =======Code for getting SKU when the Android EMEI is known========
                //     vm.AndroidEmei = event.data.emei;
                //     console.log(data.emei);
                //     inventoryService.getItem(vm.AndroidEmei).then(function(item) {
                //         vm.item = item;
                //        // vm.searchString
                //         if (item.Sku) {
                //             guideService.getGuide(item.Sku).then(function(guide) {
                //                 vm.guide = guide;
                //             });
                //         }
                //     });
                //     vm.showGuide();
                //     console.log('User.js Event app-start');
                //
           // }
        });
        //=========== End Working on catching the Android Connect before ItemNumber entered==========

        function activate() {
            var queries = [loadData()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
        function loadData() {
        }
    }
})();
