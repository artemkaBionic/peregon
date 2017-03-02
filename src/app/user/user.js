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
        vm.itemNumberError = false;
        //=======Modifying the Start Button Attribute ===========
        vm.searchStringChange = function() {
            vm.itemNumberError = false;
            if (config.itemNumberRegEx.test(vm.searchString)) {
                vm.item = null;
                inventoryService.getItem(vm.searchString).then(function(item) {
                    vm.item = item;
                    if (item.Sku) {
                        $('.bc-keypad__key-button--submit').addClass('bc-keypad-submit-active');
                       // $('.bc-keypad__key-button--submit').attr('disabled', false);
                        guideService.getGuide(item.Sku).then(function(guide) {
                            vm.guide = guide;
                        });
                    }
                }, vm.checkItem);

            } else {
                if ($('.bc-keypad__key-button--submit').hasClass('bc-keypad-submit-active')) {
                    $('.bc-keypad__key-button--submit').removeClass('bc-keypad-submit-active');
                }
                vm.item = null;
            }
        };

        vm.checkItem = function() {
            vm.itemNumberError = true;
        };

        vm.keyPadSubmit = function($event, numbers) {
            console.log($event);
            console.log(numbers);
        };

        vm.showGuide = function() {
            console.log('Show Guide is called');
            if (vm.item !== null) {
                var $stateParams = {};
                $stateParams.itemNumber = vm.item.InventoryNumber;
                vm.item = null;
                vm.guide = null;
                vm.searchString = '';
                $state.go('root.user.guide', $stateParams);
            }
        };

        vm.searchStringCheck = function() {
            if (vm.searchString != null) {
                return vm.searchString
            }
        };

        $scope.$watch(vm.searchStringCheck, vm.searchStringChange);

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
        activate();
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
