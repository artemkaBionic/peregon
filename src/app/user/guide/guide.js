(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideController', GuideController);

    GuideController.$inject = ['$q', '$stateParams', 'config', 'guideService'];

    function GuideController($q, $stateParams, config, guideService) {
        /*jshint validthis: true */
        var vm = this;
        vm.guide = {};
        vm.guideUrl = config.guidesPath + '/' + $stateParams.guide + '/' + config.guidesIndexFile;
        vm.ready = false;

        activate();

        function activate() {
            var queries = [];
            queries.push(guideService.getGuide($stateParams.guide).then(function(guide) {
                vm.guide = guide;
            }));
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
    }
})();