(function() {
    'use strict';

    angular
        .module('app.socket')
        .factory('socketService', socketService);

    socketService.$inject = ['$rootScope'];

    function socketService($rootScope) {

        var service = {};

        service.socket = io.connect();

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

        service.on = function(eventName, callback) {
            return service.socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(service.socket, args);
                });
            });
        };

        service.once = function(eventName, callback) {
            service.socket.once(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(service.socket, args);
                });
            });
        };

        service.off = service.socket.off;

        return service;
    }
})();
