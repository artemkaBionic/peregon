(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ShutDownController', ShutDownController);

    ShutDownController.$inject = ['stationService', 'eventService', 'connectionState', '$uibModalInstance', 'eventDispatcher', '$uibModal', '$timeout'];

    function ShutDownController(stationService, eventService, connectionState, $uibModalInstance, eventDispatcher, $uibModal, $timeout) {
        /*jshint validthis: true */
        var vm = this;
        vm.close = close;
        vm.reboot = reboot;
        vm.shutdown = shutdown;
        vm.turningOff = false;
        vm.rebooting = false;

        function close() {
            $uibModalInstance.dismiss('close');
        }

        function reboot() {
            vm.rebooting = true;
            $timeout(stationService.reboot, 3000);
        }

        function shutdown() {
            vm.turningOff = true;
           $timeout(stationService.shutdown, 3000);
        }
    }
})();
