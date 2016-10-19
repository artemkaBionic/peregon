(function() {
    'use strict';

    angular
        .module('app.station')
        .factory('stationService', stationService);

    stationService.$inject = ['$q', '$http'];

    function stationService($q, $http) {

        var service = {};

        service.isServiceCenter = function() {
            var url = '/data/isServiceCenter';
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.getConnectionState = function() {
            var url = '/data/getConnectionState';
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        return service;
    }
})();
