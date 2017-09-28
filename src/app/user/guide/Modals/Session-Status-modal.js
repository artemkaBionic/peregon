(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('SessionStatusModalController', SessionStatusModalController);

    SessionStatusModalController.$inject = ['popupLauncher', 'data', 'config', 'stationService', 'inventoryService', '$scope', '$rootScope'];

    function SessionStatusModalController(popupLauncher, data, config, stationService, inventoryService, $scope, $rootScope) {
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
        // jscs:disable
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
            vm.authorize = function(){
                inventoryService.getAllSessionsByParams({'device.item_number': vm.item.InventoryNumber, status:'Incomplete'}).then(function(sessions) {
                    if (sessions.length > 0) {
                        vm.sessionAlreadyInProgress = true;
                    } else {
                        if (data.session.device.serial_number !== undefined) {
                            inventoryService.updateSessionItem({'device.serial_number': vm.serialNo}, vm.item).then(function() {
                                $rootScope.$broadcast('updateList');
                                vm.closeModal();
                            });
                        } else {
                            inventoryService.updateSessionItem({'_id': data.session._id}, vm.item).then(function() {
                                $rootScope.$broadcast('updateList');
                                vm.closeModal();
                            });
                        }

                    }
                 });
            };
            vm.wrongItemNumber = function(){
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
                        vm.searchStringSkuWarning = config.partialSkuRegEx.test(vm.searchString);
                        if (config.partialItemNumberRegEx.test(vm.searchString)) {
                            vm.lastValidSearchString = vm.searchString;
                            if (config.itemNumberRegEx.test(vm.searchString)) {
                                vm.item = null;
                                inventoryService.getItem(vm.searchString).then(function(item) {
                                    vm.item = item;
                                    if (item !== null && item.Type !== vm.deviceType) {
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
        // jscs:enable
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

