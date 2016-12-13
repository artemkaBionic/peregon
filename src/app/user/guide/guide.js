(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideController', GuideController);

    GuideController.$inject = ['$q', 'item', 'config', 'guideService'];

    function GuideController($q, item, config, guideService) {
        /*jshint validthis: true */
        var vm = this;
        vm.guide = {};
        vm.guideUrl = config.guidesPath + '/' + item.Sku + '/' + config.guidesIndexFile;
        vm.ready = false;

        activate();

        function activate() {
            var queries = [];
            queries.push(guideService.getGuide(item.Sku).then(function(guide) {
                vm.guide = guide;
            }));
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
    }
})();
