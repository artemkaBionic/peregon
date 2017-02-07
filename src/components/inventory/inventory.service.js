/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular
        .module('app.inventory')
        .factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http', 'stationService'];

    function inventoryService($q, $http, stationService) {

        var service = {};

        service.items = {};

        function isValidItem(item) {
            return item && item.Sku;
        }

        service.getItem = function(id) {
            var url = '/data/inventory/' + id;
            var deferred = $q.defer();

            if (isValidItem(service.items[id])) {
                deferred.resolve(service.items[id])
            } else {
                $http.get(url).then(function(result) {
                    if (result.data.error) {
                        stationService.getConnectionState().then(function(connectionState) {
                            if (connectionState.isOnline) {
                                throw(new Error('Item number not found. Please check the number and try again.'));
                            } else {
                                throw(new Error('Unable to lookup item because the Station is Offline.'));
                            }
                        });
                    }
                    else if (isValidItem(result.data.item)) {
                        service.items[id] = result.data.item;
                        deferred.resolve(result.data.item);
                    }
                    else {
                        throw(new Error('Item not found. Please try again.'));
                    }
                });
            }

            return deferred.promise;
        };

        service.lock = function(imei) {
            var url = '/data/inventory/lock/' + imei;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.unlock = function(imei) {
            var url = '/data/inventory/unlock/' + imei;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.startSession = function(type, item) {
            var url = '/data/inventory/session/start';
            var deferred = $q.defer();

            $http.post(url, {'type': type, 'item': item}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateSession = function(itemNumber, message) {
            var url = '/data/inventory/session/update';
            var deferred = $q.defer();

            console.log(message);
            $http.post(url, {'message': message, 'itemNumber': itemNumber}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.finishSession = function(itemNumber, details) {
            var url = '/data/inventory/session/finish';
            var deferred = $q.defer();

            $http.post(url, {'details': details, 'itemNumber': itemNumber}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        return service;
    }
})();
