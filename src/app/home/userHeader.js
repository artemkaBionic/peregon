(function() {
    'use strict';

    angular
        .module('app')
        .controller('UserHeaderController', UserHeaderController);

    UserHeaderController.$inject = ['$q', '$log', 'config'];

    function UserHeaderController($q, $log, config) {
        /*jshint validthis: true */
        var vm = this;
        vm.currentUser = undefined;

        activate();

        function activate() {
            var queries = [getUser()];
            return $q.all(queries).then(function() {
                $log.info('Activated User View');
            });
        }

        function getUser(){
            var user = {name: 'admin'};
            return $q.when(user)
                .then(assignData);

            function assignData(data){
                vm.currentUser = data;
            }
        }
    }
})();
