/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.sessions').
        factory('sessionsService', sessionsService);

    sessionsService.$inject = ['$q', '$http'];

    function sessionsService($q, $http) {

        var service = {};

        service.start = function(sessionId, item, tmp) {
            var url = '/data/sessions/' + sessionId + '/start';
            var deferred = $q.defer();

            $http.post(url, {'item': item, 'tmp': tmp}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateCurrentStep = function(sessionId, currentStep) {
            var url = '/data/sessions/' + sessionId + '/updateCurrentStep';
            var deferred = $q.defer();

            $http.post(url, {'currentStep': currentStep}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.deviceBroken = function(item) {
            var url = '/data/sessions/deviceBroken';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateItem = function(params, item) {
            var deferred = $q.defer();
            $http({
                url: '/updateSessionItem',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: {params: params, item: item}
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        service.addLogEntry = function(sessionId, level, message, details) {
            var url = '/data/sessions/' + sessionId + '/addLogEntry';
            var deferred = $q.defer();

            console.log(message);
            $http.post(url,
                {
                    'level': level,
                    'message': message,
                    'details': details
                }).
                then(function() {
                    deferred.resolve();
                });

            return deferred.promise;
        };

        service.finish = function(sessionId, details) {
            var url = '/data/sessions/' + sessionId + '/finish';
            var deferred = $q.defer();

            $http.post(url, details).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.getSessionByParams = function(params) {
            var deferred = $q.defer();
            $http({
                url: '/getSessionByParams',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: params
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        service.getAllSessionsByParams = function(params) {
            var deferred = $q.defer();
            $http({
                url: '/getSessionsByParams',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: params
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        return service;
    }
})();
