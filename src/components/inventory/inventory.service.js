/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.inventory').factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http'];

    function inventoryService($q, $http) {

        var service = {};

        service.items = {};

        function isValidItem(item) {
            return item && item.sku;
        }

        var canceller = $q.defer();
        service.getItem = function(id) {
            var url = '/inventory/' + id;
            canceller.resolve(null);
            canceller = $q.defer();

            if (isValidItem(service.items[id])) {
                canceller.resolve(service.items[id]);
            } else {
                $http.get(url, {timeout: canceller.promise}).then(function(result) {
                    if (isValidItem(result.data)) {
                        service.items[id] = result.data;
                        canceller.resolve(result.data);
                    } else {
                        canceller.reject();
                    }
                });
            }

            return canceller.promise;
        };

        service.lock = function(imei) {
            var url = '/inventory/lock/' + imei;
            var deferred = $q.defer();

            $http.post(url).then(function(result) {
                if (result.code === 200) {
                    deferred.resolve(result.data);
                } else {
                    deferred.reject();
                }
            });

            return deferred.promise;
        };

        service.unlock = function(imei, forService) {
            var url = '/inventory/unlock/' + imei;
            var deferred = $q.defer();

            $http.post(url, {'forService': forService}).then(function(result) {
                if (result.code === 200) {
                    deferred.resolve(result.data);
                } else {
                    deferred.reject();
                }
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

        service.getLowestUsbProgress = function() {
            var deferred = $q.defer();
            $http.get('/getLowestUsbProgress').then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        return service;
    }
})();
