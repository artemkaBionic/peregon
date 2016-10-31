(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ShutDownController', ShutDownController);

    ShutDownController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance','eventDispatcher','$uibModal'];

    function ShutDownController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance, eventDispatcher, $uibModal) {
        /*jshint validthis: true */
        var sd = this;
        sd.close = close;
        function close() {
            $uibModalInstance.dismiss('close');
        }

        sd.reboot = reboot;
        sd.shutdown = shutdown;

        function reboot(){
            stationService.reboot();
        }

        function shutdown(){
            stationService.shutdown();
        }
    }
})();
