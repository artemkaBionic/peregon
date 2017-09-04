/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular
        .module('app.inventory')
        .factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http', 'stationService', 'toastr'];

    function inventoryService($q, $http, stationService, toastr) {

        var service = {};

        service.items = {};

        function isValidItem(item) {
            return item && item.Sku;
        }

        service.getItem = function(id) {
            var url = '/data/inventory/' + id;
            var deferred = $q.defer();

            if (isValidItem(service.items[id])) {
                deferred.resolve(service.items[id]);
            } else {
                $http.get(url).then(function(result) {
                    if (result.data.error) {
                        stationService.getConnectionState().then(function(connectionState) {
                            if (connectionState.isOnline) {
                                service.ErrorToast = true;
                                // toastr.clear(service.ErrorToast);
                                // service.ErrorToast = toastr.error('Check the ItemNumber','Item not found.', {
                                //     'timeOut': 2000,
                                //     'extendedTimeOut': 2000,
                                //     'tapToDismiss': false,
                                //     'newest-on-top': false,
                                //     'closeButton': true
                                // });
                                console.log('Item number not found. Please check the number and try again.');
                            } else {
                                service.ErrorToast = true;
                                // toastr.clear(service.ErrorToast);
                                // service.ErrorToast = toastr.error('Refresh Station is Offline','Unable to lookup item', {
                                //     'timeOut': 2000,
                                //     'extendedTimeOut': 2000,
                                //     'tapToDismiss': false,
                                //     'newest-on-top': false,
                                //     'closeButton': true
                                // });
                                console.log('Unable to lookup item because the Station is Offline.');
                            }
                        });
                    }

                    else if (isValidItem(result.data.item)) {
                        service.items[id] = result.data.item;
                        deferred.resolve(result.data.item);
                    }

                    else {
                        deferred.reject();
                        service.ErrorToast = true;
                        // toastr.clear(service.ErrorToast);
                        // service.ErrorToast = toastr.error('Please try again','Item not found', {
                        //     'timeOut': 2000,
                        //     'extendedTimeOut': 2000,
                        //     'tapToDismiss': false,
                        //     'newest-on-top':false,
                        //     'closeButton': true
                        // });
                        console.log('Item not found. Please try again.');
                    }
                });
            }

            return deferred.promise;
        };

        service.lock = function(itemNumber) {
            var url = '/data/inventory/lock/' + itemNumber;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.unlockForService = function(imei) {
            var url = '/data/inventory/unlockForService/' + imei;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.unlock = function(itemNumber) {
            var url = '/data/inventory/unlock/' + itemNumber;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.startSession = function(item) {
            var url = '/data/inventory/sessions/' + item.InventoryNumber + '/start';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        // TODO: once we will be refactoring session reports for usb only
        // refreshes we'll remove this function and will create generic one
        service.startAndroidSession = function(sessionDate, item) {
            var url = '/data/inventory/sessions/' + sessionDate + '/start';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateSession = function(itemNumber, level, message, details) {
            var url = '/data/inventory/sessions/' + itemNumber + '/update';
            var deferred = $q.defer();

            console.log(message);
            $http.post(url, {'level': level, 'message': message, 'details': details}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.finishSession = function(itemNumber, details) {
            var url = '/data/inventory/sessions/' + itemNumber + '/finish';
            var deferred = $q.defer();

            $http.post(url, {'details': details}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };
        service.checkSession = function(item) {
            var url = '/data/checkSession';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };
        service.getSession = function(sessionId) {
            var url = '/data/inventory/sessions/' + sessionId;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };
        return service;
    }
})();
