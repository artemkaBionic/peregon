(function() {
    'use strict';

    angular.module('app.user').
        controller('SessionStatusModalController',
            SessionStatusModalController);

    SessionStatusModalController.$inject = [
        'popupLauncher',
        'data',
        'config',
        'inventoryService',
        'sessionsService',
        '$scope',
        '$rootScope'];

    function SessionStatusModalController(
        popupLauncher, data, config, inventory, sessions, $scope, $rootScope) {
        /*jshint validthis: true */
        var vm = this;
        vm.searchString = '';
        vm.itemNumberError = false;
        vm.searchStringError = false;
        vm.searchStringSkuWarning = false;
        vm.showItemInput = false;
        vm.lastValidSearchString = '';
        vm.item = null;
        vm.showLoader = false;
        vm.showAuthCheck = false;
        vm.showAuth = true;
        vm.sessionAlreadyInProgress = false;
        vm.wrongDeviceType = false;
        vm.showUnrecoginzedDeviceFooter = false;
        vm.serialNo = null;
        if (data.errors) {
            vm.errors = data.errors;
        } else {
            vm.message = data.message;
            if (data.sessionId) {
                vm.sessionId = data.sessionId;
            }
            if (data.session) {
                vm.showUnrecoginzedDeviceFooter = true;
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

            if (vm.sessionId !== undefined) {
                vm.showItemInput = true;

                vm.searchStringChange = function() {
                    vm.sessionAlreadyInProgress = false;
                    vm.wrongDeviceType = false;
                    vm.searchString = vm.searchString.toUpperCase();
                    if (vm.searchString !== vm.lastValidSearchString) {
                        vm.searchStringError = false;
                        vm.itemNumberError = false;
                        //vm.sessionAlreadyInProgress = false;
                        vm.searchStringSkuWarning = config.partialSkuRegEx.test(
                            vm.searchString);
                        if (config.partialItemNumberRegEx.test(
                                vm.searchString)) {
                            vm.lastValidSearchString = vm.searchString;
                            if (config.itemNumberRegEx.test(vm.searchString)) {
                                vm.item = null;
                                inventory.getItem(vm.searchString).
                                    then(function(item) {
                                        vm.item = item;
                                        if (item !== null &&
                                            item.type !== vm.deviceType) {
                                            vm.wrongDeviceType = true;
                                        }
                                        vm.itemNumberError = false;
                                    }, function() {
                                        if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                            vm.itemNumberError = true;
                                        }
                                    });
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

