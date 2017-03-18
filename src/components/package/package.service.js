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
            var deferred = $q.defer();

            $http.get(config.packageIndex).then(function(result) {
                for (var i = 0, len = result.data.length; i < len; ++i) {
                    if (result.data[i].SKU === sku) {
                        deferred.resolve(true);
                    }
                }
                deferred.resolve(false);
            });

            return deferred.promise;
        };

        return service;
    }
})();
