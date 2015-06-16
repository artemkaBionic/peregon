(function() {
    'use strict';

    angular
        .module('app.guide')
        .factory('guideService', guideService);

    guideService.$inject = ['$http', '$log', 'config', '$q'];

    function guideService($http, $log, config, $q) {

        var service = {};

        service.searchString = '';
        service.guides = null;

        service.getGuides = function() {
            var deferred = $q.defer();

            var getRegExChar = function(char) {
                return (char === '_' ? '.' : char);
            };

            $http.get(config.packageIndex).then(function(result) {
                for (var guideIndex = 0, len = result.data.length; guideIndex < len; ++guideIndex) {
                    var charIndex = result.data[guideIndex].SKU.length - 1;
                    var pattern = getRegExChar(result.data[guideIndex].SKU[charIndex]);
                    for (; charIndex-- > 0;) {
                        pattern = getRegExChar(result.data[guideIndex].SKU[charIndex]) + '(' + pattern + ')?';
                    }
                    result.data[guideIndex].SkuRegEx = new RegExp(pattern, 'i');
                }
                service.guides = result.data;
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
                var len = service.guides.length;
                for (var i = 0; i < len; ++i) {
                    if (sku.length === service.guides[i].SKU.length) {
                        var match = sku.match(service.guides[i].SkuRegEx);
                        if (match !== null && match[0] === sku) {
                            return service.guides[i];
                        }
                    }
                }
                return null;
            });

            return promise;
        };

        return service;
    }
})();
