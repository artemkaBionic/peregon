(function() {
    'use strict';

    angular
        .module('app')
        .controller('ApplicationController', AppController);

    AppController.$inject = ['config', '$scope', '$rootScope', '$apcSidebar', 'notificationService', 'eventService', '$log'];
    function AppController(config, $scope, $rootScope, $apcSidebar, notificationService, eventService, $log) {
        /*jshint validthis: true */
        var vm = this;

        vm.title = config.appTitle;
        vm.toggleSidebar = toggleSidebar;

        $scope.app = config;

        activate();

        function activate() {
            $log.debug('application: activate');

            var listener = $rootScope.$on('$viewContentLoaded', function() {
                listener();

                function showWelcome(user) {
                    notificationService.success('Welcome back', user.firstName + ' ' + user.lastName);
                }
            });
        }

        function toggleSidebar(){
            $apcSidebar.toggleSidebar();
        }
    }
})();
