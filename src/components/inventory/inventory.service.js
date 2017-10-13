/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.inventory').
        factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http', 'stationService'];

    function inventoryService($q, $http, station) {

        var service = {};

        service.items = {};

        function isValidItem(item) {
            return item && item.sku;
        }

        var canceller = $q.defer();
        service.getItem = function(id) {
            var url = '/data/inventory/' + id;
            canceller.resolve(null);
            canceller = $q.defer();

            if (isValidItem(service.items[id])) {
                canceller.resolve(service.items[id]);
            } else {
                $http.get(url, {timeout: canceller.promise}).
                    then(function(result) {
                        if (result.data.error) {
                            station.getConnectionState().
                                then(function(connectionState) {
                                    if (connectionState.isOnline) {
                                        console.log(
                                            'Item number not found. Please check the number and try again.');
                                    } else {
                                        console.log(
                                            'Unable to lookup item because the Station is Offline.');
                                    }
                                });
                        }

                        else if (isValidItem(result.data.item)) {
                            console.log('valid item');
                            service.items[id] = result.data.item;
                            canceller.resolve(result.data.item);
                        }

                        else {
                            canceller.reject();
                            console.log('Item not found. Please try again.');
                        }
                    });
            }

            return canceller.promise;
        };

        service.lock = function(imei) {
            var url = '/data/inventory/lock/' + imei;
            var deferred = $q.defer();

            $http.post(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.unlock = function(imei, forService) {
            var url = '/data/inventory/unlock/' + imei;
            var deferred = $q.defer();

            $http.post(url, {'forService': forService}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.getAllUsbDrives = function() {
            var deferred = $q.defer();
            $http.get('/getAllUsbDrives').then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        service.getLowestUsbInProgress = function() {
            var deferred = $q.defer();
            $http.get('/getLowestUsbInProgress').then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        return service;
    }
})();
