(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerWindows', GuideControllerWindows);

    GuideControllerWindows.$inject = ['$q', 'config', 'item', 'packageService', '$state'];

    function GuideControllerWindows($q, config, item, packageService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.isPackageReady = null;
        vm.item = item;
        vm.guideUrl = config.guidesPath + '/' + item.Sku + '/' + config.guidesIndexFile;
        vm.ready = false;

        activate();
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function activate() {
            var queries = [checkIsPackageReady()];
            $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function checkIsPackageReady() {
            packageService.isPackageReady(item.Sku).then(function(result) {
                vm.isPackageReady = result;
            });
        }
    }
})();
