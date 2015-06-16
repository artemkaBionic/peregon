(function() {
    'use strict';

    angular
        .module('app.guide')
        .factory('socketService', socketService);

    socketService.$inject = ['$rootScope'];

    function socketService($rootScope) {

        var service = {};

        service.socket = io.connect();

        service.on = function(eventName, callback) {
            service.socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(service.socket, args);
                });
            });
        };

        service.emit = function(eventName, data, callback) {
            service.socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(service.socket, args);
                    }
                });
            });
        };

        return service;
    }
})();
