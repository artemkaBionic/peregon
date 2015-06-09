(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('PostListController', PostListController);

    PostListController.$inject = ['$q', 'dataService'];
    function PostListController($q, dataService) {
        /*jshint validthis: true */
        var vm = this;
        vm.posts = [];
        vm.ready = false;

        activate();

        function activate() {
            var queries = [loadData()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadData() {
            return dataService.getPosts()
                .then(assignData);

            function assignData(data) {
                vm.posts = data;
            }
        }
    }
})();
