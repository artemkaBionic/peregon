(function() {
    'use strict';

    angular
        .module('app.package')
        .factory('packageService', packageService);

    packageService.$inject = ['$q', '$http', 'config'];

    function packageService($q, $http, config) {

        var service = {};

        service.getMediaPackages = function(subtype) {
            var url = '/data/packages/media';
            var deferred = $q.defer();

            if (typeof subtype !== 'undefined') {
                url = url + '/' + subtype;
            }

            $http.get(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.isPackageReady = function(sku) {
            var url = '/data/package/' + sku;
            var deferred = $q.defer();

            $http.get(url).then(function(result) {
                deferred.resolve(result.data.isDownloaded);
            });

            return deferred.promise;
        };

        return service;
    }
})();
