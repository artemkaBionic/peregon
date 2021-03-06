(function() {
    'use strict';

    angular
        .module('app')
        .controller('ApplicationController', AppController);

    AppController.$inject = ['config', '$scope', '$rootScope', '$apcSidebar', 'notificationService', '$log'];
    function AppController(config, $scope, $rootScope, $apcSidebar, notificationService, $log) {
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
            });
        }

        function toggleSidebar(){
            $apcSidebar.toggleSidebar();
        }
    }
})();
