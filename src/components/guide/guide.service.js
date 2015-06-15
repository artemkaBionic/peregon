(function() {
    'use strict';

    angular
        .module('app.guide')
        .factory('guideService', guideService);

    guideService.$inject = ['$http', '$log', 'config', '$q'];

    function guideService($http, $log, config, $q) {

        var service = {};

        service.searchString = '';

        service.getGuides = function() {
            var deferred = $q.defer();

            var getRegExChar = function(char) {
                return (char === "_" ? "." : char);
            };

            $http.get(config.packageIndex).then(function(result) {
                for (var guideIndex = 0, len = result.data.length; guideIndex < len; ++guideIndex) {
                    var charIndex = result.data[guideIndex].SKU.length - 1;
                    var pattern = getRegExChar(result.data[guideIndex].SKU[charIndex]);
                    for ( ; charIndex-- > 0; ) {
                        pattern = getRegExChar(result.data[guideIndex].SKU[charIndex]) + "(" + pattern + ")?";
                    }
                    result.data[guideIndex].SkuRegEx = new RegExp(pattern);
                }
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        return service;
    }
})();
