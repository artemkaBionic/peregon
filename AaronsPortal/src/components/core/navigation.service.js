(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('navigationService', navigationService);

    navigationService.$inject = ['$timeout', '$state'];

    function navigationService($timeout, $state) {
        var service = {
            goWithDelay: goWithDelay
        };

        return service;

        function goWithDelay(state, timeout) {
            return $timeout(function() {}, timeout)
                .then(navigate);

            function navigate() {
                $timeout(function() {
                    $state.go(state);
                }, 500);
            }
        }
    }
})();
