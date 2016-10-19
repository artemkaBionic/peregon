/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular
        .module('app.inventory')
        .factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http'];

    function inventoryService($q, $http) {

        var service = {};

        service.getItem = function(id) {
            var url = '/data/inventory/' + id;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        return service;
    }
})();
