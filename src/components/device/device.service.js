(function() {
    'use strict';

    angular
        .module('app.device')
        .factory('deviceService', deviceService);

    deviceService.$inject = ['$q', '$http'];

    function deviceService($q, $http) {

        var service = {};

        service.devices = null;

        service.getDevices = function() {
            var url = '/data/devices';
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                service.devices = result.data;
                deferred.resolve(service.devices);
            });

            return deferred.promise;
        };

        service.getDevice = function(id) {
            var promise = $q.when(null); //initial start promise that's already resolved

            if (service.devices === null) {
                promise = service.getDevices();
            }

            promise = promise.then(function() {
                var len = service.devices.length;
                for (var i = 0; i < len; ++i) {
                    if (service.devices[i].id === id) {
                        return service.devices[i];
                    }
                }
                return null;
            });

            return promise;
        };

        service.addDevice = function(device) {
            var promise = $q.when(null); //initial start promise that's already resolved

            if (service.devices === null) {
                promise = service.getDevices();
            }

            promise = promise.then(function() {
                service.removeDevice(device.id); //Ensure that there are no duplicate devices
                service.devices.push(device);
            });

            return promise;
        };

        service.removeDevice = function(id) {
            var promise = $q.when(null); //initial start promise that's already resolved

            if (service.devices === null) {
                promise = service.getDevices();
            }

            promise = promise.then(function() {
                for (var i = service.devices.length - 1; i >= 0; i--) {
                    if (service.devices[i].id === id) {
                        service.devices.splice(i, 1);
                    }
                }
            });

            return promise;
        };

        return service;
    }
})();
