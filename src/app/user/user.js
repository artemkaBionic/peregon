(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$q', '$state', 'config', '$http', 'inventoryService', '$uibModal', 'guideService', 'socketService', 'stationService', 'eventService'];

    function UserController($q, $state, config, $http, inventoryService, $uibModal, guideService, socketService, stationService, eventService) {
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
                vm.searchString = null;
                vm.item = null;
            }
        };

        activate();

        socketService.on('event', function(event) {
            if (event.name === 'app-start') {
                if (!eventService.AndroidGuideInProcess) {
                    //=======Code for getting SKU when the Android EMEI is known========
                    // vm.AndroidEmei = event.data.emei;
                    // console.log(event.data.emei);
                    // inventoryService.getItem(vm.AndroidEmei).then(function(item) {
                    //     vm.item = item;
                    //     vm.searchString
                    //     if (item.Sku) {
                    //         guideService.getGuide(item.Sku).then(function(guide) {
                    //             vm.guide = guide;
                    //         });
                    //     }
                    // });
                    // vm.showGuide();
                    console.log('User.js Event app-start');
                }
            }
        });

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
