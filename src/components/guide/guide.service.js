(function() {
    'use strict';

    angular
        .module('app.guide')
        .factory('guideService', guideService);

    guideService.$inject = ['$q', '$http', 'config'];

    function guideService($q, $http, config) {

        var service = {};

        var dynamicGuides = config.guides;

        service.searchString = '';
        service.guides = null;

        service.getGuides = function() {
            var deferred = $q.defer();

            var getRegExChar = function(char) {
                return (char === '_' ? '.' : char);
            };

            $http.get(config.packageIndex).then(function(result) {
                service.guides = dynamicGuides;
                for (var i = 0, len = result.data.length; i < len; ++i) {
                    if (!service.guides[result.data[i].SKU]) {
                        service.guides[result.data[i].SKU] = result.data[i];
                    }
                }
                deferred.resolve(service.guides);
            });

            return deferred.promise;
        };

        service.getGuide = function(sku) {
            var promise = $q.when(null); //initial start promise that's already resolved

            if (service.guides === null) {
                promise = service.getGuides();
            }

            promise = promise.then(function() {
                if (service.guides[sku]) {
                    return service.guides[sku];
                } else {
                    return null;
                }
            });

            return promise;
        };

        return service;
    }
})();
