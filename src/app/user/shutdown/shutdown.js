(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ShutDownController', ShutDownController);

    ShutDownController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance','eventDispatcher','$uibModal'];

    function ShutDownController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance, eventDispatcher, $uibModal) {
        /*jshint validthis: true */
        var sd = this;

    }
})();
