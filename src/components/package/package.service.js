(function() {
    'use strict';

    angular
        .module('app.package')
        .factory('packageService', packageService);

    packageService.$inject = ['$q', '$http'];

    function packageService($q, $http) {

        var service = {};

        service.mediaPackages = null;

        service.getMediaPackages = function(subtype) {
            var url = '/data/packages/media';
            var deferred = $q.defer();

            if (subtype !== undefined) {
                url = url + '/' + subtype;
            }

            $http.get(url).then(function(result) {
                service.mediaPackages = result.data;
                deferred.resolve(service.mediaPackages);
            });

            return deferred.promise;
        };

        return service;
    }
})();
