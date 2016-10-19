(function() {
    'use strict';

    angular
        .module('app.guide')
        .factory('guideService', guideService);

    guideService.$inject = ['$http', '$log', 'config', '$q'];

    function guideService($http, $log, config, $q) {

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
                service.guides = dynamicGuides.concat(result.data);
                for (var guideIndex = 0, len = service.guides.length; guideIndex < len; ++guideIndex) {
                    var charIndex = service.guides[guideIndex].SKU.length - 1;
                    var pattern = getRegExChar(service.guides[guideIndex].SKU[charIndex]);
                    for (; charIndex-- > 0;) {
                        pattern = getRegExChar(service.guides[guideIndex].SKU[charIndex]) + '(' + pattern + ')?';
                    }
                    service.guides[guideIndex].SkuRegEx = new RegExp(pattern, 'i');
                }
                deferred.resolve(service.guides);
            });

            return deferred.promise;
        };

        service.getGuideSync = function(sku) {
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
        };

        service.getGuide = function(sku) {
            var promise = $q.when(null); //initial start promise that's already resolved

            if (service.guides === null) {
                promise = service.getGuides();
            }

            promise = promise.then(function() {
                return service.getGuideSync(sku);
            });

            return promise;
        };

        return service;
    }
})();
