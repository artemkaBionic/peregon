(function() {
    'use strict';

    angular
        .module('app.user')
        .component('windowsGuide',
            {
                bindings: {
                    item: '<'
                },
                controller: windowsGuideController,
                controllerAs: 'vm',
                templateUrl: 'app/user/guide/Windows/windows_guide/windowsGuide.template.html'
            }
        );

    windowsGuideController.$inject = [];

    function windowsGuideController() {
        var vm = this;
        vm.test = 'test';
        console.log(vm.item);
    }
})();

