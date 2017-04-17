(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$q', '$state', 'config', 'inventoryService', 'socketService', '$scope'];

    function UserController($q, $state, config, inventoryService, socketService, $scope) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        vm.searchString = '';
        vm.lastValidSearchString = '';
        vm.item = null;
        vm.AndroidEmei = null;
        vm.itemNumberError = false;
        vm.searchStringError = false;
        vm.searchStringSkuWarning = false;

        vm.searchStringChange = function() {
            vm.searchString = vm.searchString.toUpperCase();
            if (vm.searchString !== vm.lastValidSearchString) {
                vm.searchStringError = false;
                vm.itemNumberError = false;
                vm.searchStringSkuWarning = config.partialSkuRegEx.test(vm.searchString);
                if (config.partialItemNumberRegEx.test(vm.searchString)) {
                    vm.lastValidSearchString = vm.searchString;
                    if (config.itemNumberRegEx.test(vm.searchString)) {
                        vm.item = null;
                        inventoryService.getItem(vm.searchString).then(function(item) {
                            vm.item = item;
                            vm.itemNumberError = false;
                            // enable keypad submit button
                            $('.bc-keypad__key-button--submit').addClass('bc-keypad-submit-enabled');
                        }, function() {
                            if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                vm.itemNumberError = true;
                            }
                        });
                    } else {
                        // disable keypad submit button
                        if ($('.bc-keypad__key-button--submit').hasClass('bc-keypad-submit-enabled')) {
                            $('.bc-keypad__key-button--submit').removeClass('bc-keypad-submit-enabled');
                        }
                        vm.item = null;
                    }
                } else {
                    vm.searchString = vm.lastValidSearchString;
                    if (vm.item === null) {
                        vm.searchStringError = true;
                    }
                }
            }
        };
        $scope.$watch('vm.searchString', vm.searchStringChange);

        vm.showGuide = function() {
            if (vm.item !== null) {
                var $stateParams = {};
                $stateParams.itemNumber = vm.item.InventoryNumber;
                vm.item = null;
                vm.searchString = '';
                $state.go('root.user.guide', $stateParams);
            }
        };

        //=========== Start Working on catching the Android Connect before ItemNumber entered==========
        socketService.on('app-start', function(data) {
            // if (!eventService.AndroidGuideInProcess) {
            //    // =======Code for getting SKU when the Android EMEI is known========
            //     vm.AndroidEmei = event.data.emei;
            //     console.log(data.emei);
            //     inventoryService.getItem(vm.AndroidEmei).then(function(item) {
            //         vm.item = item;
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
