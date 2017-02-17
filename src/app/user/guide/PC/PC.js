(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerPC', GuideControllerPC);

    GuideControllerPC.$inject = ['$q', '$scope', 'socketService', '$state', 'popupLauncher', 'toastr', '$timeout', 'inventoryService', 'item', 'eventService'];

    function GuideControllerPC($q, $scope, socketService, $state, popupLauncher, toastr, $timeout, inventoryService, item, eventService) {

        /*jshint validthis: true */
        var vm = this;
        var timeouts = [];
        vm.item = item;
        vm.step = null;

        vm.activate = function() {

        };
        vm.activate();
    }
})();
