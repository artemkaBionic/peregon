(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('PostDetailsController', PostDetailsController);

    PostDetailsController.$inject = ['post', '$q'];

    function PostDetailsController(post, $q) {
        /*jshint validthis: true */
        var vm = this;
        vm.post = post;
        vm.ready = false;

        activate();

        function activate() {
            var queries = [];
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
    }
})();
