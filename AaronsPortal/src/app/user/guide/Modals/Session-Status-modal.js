(function() {
    'use strict';

    angular.module('app.user').controller('SessionStatusModalController',
        SessionStatusModalController);

    SessionStatusModalController.$inject = ['$q', 'popupLauncher', 'data', 'config', 'inventoryService', 'sessionsService', '$scope'];

    function SessionStatusModalController($q, popupLauncher, data, config, inventory, sessions, $scope) {
        /*jshint validthis: true */
        var vm = this;
        vm.searchString = '';
        vm.itemNumberError = false;
        vm.searchStringError = false;
        vm.searchStringSkuWarning = false;
        vm.showItemInput = false;
        vm.lastValidSearchString = '';
        vm.item = null;
        vm.sessionId = null;
        vm.showLoader = false;
        vm.showAuthCheck = false;
        vm.showAuth = true;
        vm.sessionAlreadyInProgress = false;
        vm.wrongDeviceType = false;
        vm.showUnrecognizedDeviceFooter = false;
        vm.manufacturer = null;
        vm.model = null;
        vm.serialNo = null;
        if (data.errors) {
            vm.errors = data.errors;
        } else {
            vm.message = data.message;
            if (data.session) {
                vm.sessionId = data.session._id;
                vm.showUnrecognizedDeviceFooter = true;
                vm.manufacturer = data.session.device.manufacturer;
                vm.model = data.session.device.model;
                vm.serialNo = data.session.device.serial_number;
                vm.deviceType = data.session.device.type;
            }
            vm.authorize = function() {
                sessions.updateItem(data.session._id, vm.item).then(function() {
                    vm.closeModal();
                });
            };
            vm.wrongItemNumber = function() {
                vm.searchString = '';
            };

            if (vm.sessionId !== null) {
                vm.showItemInput = true;

                var canceller = null;
                var getItem = function() {
                    vm.item = null;
                    if (vm.searchString !== '') {
                        vm.itemNumberLoading = true;
                        if (canceller !== null) {
                            canceller.resolve(null);
                            canceller = null;
                        }
                        canceller = $q.defer();
                        inventory.getItem(vm.searchString, canceller).then(function(item) {
                            if (item) {
                                vm.item = item;
                                vm.itemNumberLoading = false;
                                vm.itemNumberError = false;
                                vm.wrongDeviceType = !vm.deviceType.startsWith(item.product.type);
                            } else {
                                if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                    vm.itemNumberLoading = false;
                                    vm.itemNumberError = true;
                                    vm.wrongDeviceType = false;
                                }
                            }
                        }, function() {
                            if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                vm.itemNumberLoading = false;
                                vm.itemNumberError = true;
                                vm.wrongDeviceType = false;
                            }
                        });
                    }
                };

                var searchStringChangeTimeout;
                vm.searchStringChange = function() {
                    vm.sessionAlreadyInProgress = false;
                    vm.searchString = vm.searchString.toUpperCase();
                    if (vm.searchString !== vm.lastValidSearchString) {
                        if (canceller !== null) {
                            canceller.resolve(null);
                            canceller = null;
                        }
                        vm.searchStringError = false;
                        vm.itemNumberLoading = false;
                        vm.itemNumberError = false;
                        vm.wrongDeviceType = false;
                        vm.searchStringSkuWarning = config.partialSkuRegEx.test(vm.searchString);
                        if (config.partialItemNumberRegEx.test(vm.searchString)) {
                            vm.lastValidSearchString = vm.searchString;
                            if (config.itemNumberRegEx.test(vm.searchString)) {
                                //Wait to make sure user is done typing
                                clearTimeout(searchStringChangeTimeout);
                                searchStringChangeTimeout = setTimeout(getItem, 500);
                            } else {
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
            }
        }
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

