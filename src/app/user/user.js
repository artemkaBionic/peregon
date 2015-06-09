(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['dataService', '$q'];

    function UserController(dataService, $q) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;

        activate();

        function activate() {
            var queries = [loadData()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadData() {
        }
    }
})();
