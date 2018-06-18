(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ShutDownController', ShutDownController);

    ShutDownController.$inject = ['stationService', '$uibModalInstance', '$timeout'];

    function ShutDownController(station, $uibModalInstance, $timeout) {
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
            $timeout(station.reboot, 3000);
        }

        function shutdown() {
            vm.turningOff = true;
           $timeout(station.shutdown, 3000);
        }
    }
})();
