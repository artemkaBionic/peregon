(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerUnsupported', GuideControllerUnsupported);

    GuideControllerUnsupported.$inject = ['$q', 'item', '$state'];

    function GuideControllerUnsupported($q, item, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.item = item;
        vm.ready = false;

        activate();
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            var queries = [];
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
    }
})();
