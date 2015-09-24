(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerXboxOne', GuideControllerXboxOne);

    GuideControllerXboxOne.$inject = ['$q', '$stateParams', 'config', 'guideService'];

    function GuideControllerXboxOne($q, $stateParams, config, guideService) {
        /*jshint validthis: true */
        var vm = this;
        vm.guide = {};
        vm.guideUrl = config.guidesPath + '/' + $stateParams.guide + '/' + config.guidesIndexFile;
        vm.ready = false;
        vm.step = 1;

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

        vm.setStep = function(step) {
            vm.step = step;
        };
    }
})();
