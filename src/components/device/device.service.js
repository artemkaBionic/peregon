(function() {
    'use strict';

    angular
        .module('app.device')
        .factory('deviceService', deviceService);

    deviceService.$inject = ['$q', '$http'];

    function deviceService($q, $http) {

        var service = {};

        service.getDevices = function() {
            var url = '/data/devices';
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.getDevice = function(id) {
            var url = '/data/devices/' + id;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        return service;
    }
})();
