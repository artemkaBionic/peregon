(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('_', underscoreService);

    underscoreService.$inject = ['$window'];

    function underscoreService($window) {
        return $window._; // assumes underscore has already been loaded on the page
    }
})();
