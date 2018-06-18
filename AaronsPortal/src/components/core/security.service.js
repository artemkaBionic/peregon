(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('securityService', securityService);

    securityService.$inject = ['$q'];

    function securityService($q) {
        var initialized;

        var service = {
            //promises
            initSession: initSession,
            getSession: getSession,

            //sync
            user: undefined,
            hasRole: hasRole,
            hasRoles: hasRoles,
            isAuthenticated: isAuthenticated
        };

        return service;

        function initSession() {
            //fake user: should be replaced with rest call
            service.user = {name: 'admin', roles: []};
            initialized = true;

            return $q.when(service.user);
        }

        function getSession() {
            return (service.user) ? $q.when(service.user) : initSession();
        }

        function isAuthenticated() {
            checkInitialized();

            return (service.user !== undefined);
        }

        function hasRole(role) {
            checkInitialized();

            return service.user.roles.indexOf(role) !== -1;
        }

        function hasRoles(roles) {
            checkInitialized();

            for (var i = 0, len = roles.length; i < len; i++) {
                var role = roles[i];
                if (service.user.roles.indexOf(role) === -1) {
                    return false;
                }
            }
            return true;
        }

        function checkInitialized() {
            if (!initialized) {
                throw 'User session is not initialized yet.';
            }
        }
    }
})();
