(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('HomeUsbGuidesController', HomeUsbGuidesController);

    HomeUsbGuidesController.$inject = ['$stateParams'];

    function HomeUsbGuidesController($stateParams) {
        var vm = this;
        vm.item = {
            type: $stateParams.type,
            manufacturer: $stateParams.manufacturer,
            CalledFromHome: true
        };
        if ($stateParams.manufacturer === 'hp') {
            vm.title = 'HP laptop refresh instructions';
        } else if ($stateParams.manufacturer === 'dell') {
            vm.title = 'Dell laptop refresh instructions';
        } else if ($stateParams.type === 'XboxOne') {
            vm.title = 'X-Box One refresh instructions';
        } else {
            vm.title = 'Mac refresh instructions';
        }
    }
})();
