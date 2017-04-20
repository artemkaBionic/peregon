(function() {
    'use strict';

    angular
        .module('app')
        .controller('UserHeaderController', UserHeaderController);

    UserHeaderController.$inject = ['$q', '$log', 'config', 'socketService', 'eventService'];

    function UserHeaderController($q, $log, config, socketService, eventService) {
        /*jshint validthis: true */
        var vm = this;
        vm.currentUser = undefined;
        vm.InternetConnection = eventService.InternetConnection;
        socketService.on('connection-status', function(data) {
            vm.processConnectionState(data);
        });

        vm.processConnectionState = function(connectionState) {
            if (connectionState === null) {
                return;
            }

            if (!connectionState.isOnline) {
                vm.InternetConnection = false;
            } else {
                vm.InternetConnection = true;
            }
        };

        activate();
        function activate() {
            var queries = [getUser()];
            return $q.all(queries).then(function() {
                $log.info('Activated User View');
            });
        }

        function getUser() {
            var user = {name: 'admin'};
            return $q.when(user)
                .then(assignData);

            function assignData(data) {
                vm.currentUser = data;
            }
        }
    }
})();
