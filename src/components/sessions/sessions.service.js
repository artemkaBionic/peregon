/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.sessions').factory('sessionsService', sessionsService);

    sessionsService.$inject = ['$q', '$http'];

    function sessionsService($q, $http) {

        var service = {};

        service.start = function(item, tmp) {
            var url = '/sessions/start';
            var deferred = $q.defer();

            $http.post(url, {'item': item, 'tmp': tmp}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateCurrentStep = function(sessionId, currentStep) {
            var url = '/sessions/' + sessionId + '/updateCurrentStep';
            var deferred = $q.defer();

            $http.post(url, {'currentStep': currentStep}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateItem = function(sessionId, item) {
            var url = '/sessions/' + sessionId + '/updateItem';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.addLogEntry = function(sessionId, level, message, details) {
            var url = '/sessions/' + sessionId + '/addLogEntry';
            var deferred = $q.defer();

            //console.log(message);
            $http.post(url,
                {
                    'level': level,
                    'message': message,
                    'details': details
                }).then(function() {
                deferred.resolve();
            });

            return deferred.promise;
        };

        service.finish = function(sessionId, details) {
            var url = '/sessions/' + sessionId + '/finish';
            var deferred = $q.defer();

            $http.post(url, details).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.getIncomplete = function(itemNumber) {
            var deferred = $q.defer();
            $http({
                url: '/sessions/incomplete/' + itemNumber,
                method: 'GET',
                headers: {'content-type': 'application/json'}
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        service.getAll = function() {
            var deferred = $q.defer();
            $http({
                url: '/sessions',
                method: 'GET',
                headers: {'content-type': 'application/json'}
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };

        return service;
    }
})();
