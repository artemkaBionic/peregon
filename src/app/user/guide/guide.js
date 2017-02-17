(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideController', GuideController);

    GuideController.$inject = ['$q', 'item', 'config', 'guideService', '$state'];

    function GuideController($q, item, config, guideService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.guide = {};
        vm.guideUrl = config.guidesPath + '/' + item.Sku + '/' + config.guidesIndexFile;
        vm.ready = false;

        activate();
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            var queries = [];
            queries.push(guideService.getGuide(item.Sku).then(function(item) {
                vm.item = item;
            }));
            queries.push(guideService.getGuide(item.Sku).then(function(guide) {
                vm.guide = guide;
            }));
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
    }
})();
