(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideController', GuideController);

    GuideController.$inject = ['$q', '$stateParams', 'config'];

    function GuideController($q, $stateParams, config) {
        /*jshint validthis: true */
        var vm = this;
        vm.guideName = $stateParams.guide;
        vm.guideUrl = config.guidesPath + '/' + vm.guideName + '/' + config.guidesIndexFile;
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
