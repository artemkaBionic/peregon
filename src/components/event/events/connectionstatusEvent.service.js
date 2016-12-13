(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('deviceaddEventService', deviceaddEventService);

    deviceaddEventService.$inject = [];

    function deviceaddEventService() {
        var service = {
            run: run
        };

        return service;

        function run(event) {

        }

    }
})();
