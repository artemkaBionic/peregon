(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('MediaController', MediaController);

    MediaController.$inject = ['$scope', '$stateParams', '$q', 'deviceService', 'packageService'];

    function MediaController($scope, $stateParams, $q, deviceService, packageService) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        $scope.selectedDevice = null;
        $scope.devices = [];
        $scope.mediaPackages = [];

        activate();

        function activate() {
            var queries = [loadDevices(), loadMediaPackages()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadDevices() {
            deviceService.getDevices().then(function(devices) {
                $scope.devices = devices;
                if ($stateParams.deviceId === null && $scope.devices.length > 0) {
                    $scope.selectedDevice = $scope.devices[0];
                } else {
                    deviceService.getDevice($stateParams.deviceId).then(function(selectedDevice) {
                        $scope.selectedDevice = selectedDevice;
                    });
                }
            });
        }

        function loadMediaPackages() {
            packageService.getMediaPackages().then(function(mediaPackages) {
                $scope.mediaPackages = mediaPackages;
            });
        }
    }
})();
