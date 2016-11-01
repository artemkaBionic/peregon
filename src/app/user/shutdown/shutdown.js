(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ShutDownController', ShutDownController);

    ShutDownController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance','eventDispatcher','$uibModal','$timeout'];

    function ShutDownController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance, eventDispatcher, $uibModal, $timeout) {
        /*jshint validthis: true */
        var sd = this;
        sd.close = close;
        sd.reboot = reboot;
        sd.shutdown = shutdown;
        sd.turningOff = false;
        sd.rebooting = false;

        function close() {
            $uibModalInstance.dismiss('close');
        }

        function reboot(){
            sd.rebooting = true;
            $timeout(stationService.reboot, 5000);
        }

        function shutdown(){
            sd.turningOff = true;
           $timeout(stationService.shutdown, 5000);
        }
    }
})();
