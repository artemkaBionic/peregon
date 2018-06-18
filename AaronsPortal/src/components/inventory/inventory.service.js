/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.inventory').factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http'];

    function inventoryService($q, $http) {

        var service = {};

        function isValidItem(item) {
            return item && item.sku;
        }

        service.getItem = function(id, canceller) {
            var deferred = $q.defer();
            var url = '/inventory/' + id;
            var config = {};

            if (canceller) {
                config.timeout = canceller.promise;
            }

            $http.get(url, config).then(function(result) {
                if (isValidItem(result.data)) {
                    deferred.resolve(result.data);
                } else {
                    deferred.reject();
                }
            });

            return deferred.promise;
        };

        service.lock = function(imei) {
            var url = '/inventory/lock/' + imei;
            var deferred = $q.defer();

            $http.post(url).then(function(result) {
                if (result.status === 200) {
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
                if (result.status === 200) {
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
        return service;
    }
})();
