(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ConnectionController', ConnectionController);

    ConnectionController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance'];

    function ConnectionController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance) {
        /*jshint validthis: true */
        var vm = this;
        vm.selectedNetworkDevice = null;
        vm.connectionState = connectionState;
        vm.networkDevices = [];
        vm.isPortDetectable = false;
        vm.steps = {
            selectNetworkDevice: {
                name: 'selectNetworkDevice',
                number: 1,
                title: 'Select Network Device'
            },
            connectToNetwork: {
                name: 'connectToNetwork',
                number: 2,
                title: 'Connect to Network'
            },
            complete: {
                name: 'complete',
                number: 4,
                title: 'Refresh Station is Connected to the Internet'
            }
        };
        vm.step = vm.steps.selectNetworkDevice;
        vm.close = close;

        $scope.$on('$destroy', function(){
            eventService.EnableOfflineNotification();
        });

        activate();

        function activate() {

            // Offline Notification still enabled
            // eventService.DisableOfflineNotification();

            var queries = [loadNetworkDevices(), loadConnectionState()];
            $q.all(queries).then(function() {
                for (var i = 0; i < config.networkDevices.length; ++i) {

                    if (config.networkDevices[i].description == vm.connectionState.description) {
                        vm.isPortDetectable = config.networkDevices[i].isPortDetectable;
                        break;
                    }
                }

                if (vm.connectionState.isOnline) {
                    vm.step = vm.steps.complete;
                } else if (vm.networkDevices.length === 1) {
                    vm.selectNetworkDevice(vm.networkDevices[0]);
                }
            });
        }

        function close() {
            $uibModalInstance.dismiss('close');
        }

        function loadNetworkDevices() {
            stationService.isServiceCenter().then(function(isServiceCenter) {
                for (var i = 0; i < config.networkDevices.length; ++i) {
                    if (config.networkDevices[i].isServiceCenterConfig === isServiceCenter) {
                        vm.networkDevices.push(config.networkDevices[i]);
                    }
                }
            });
        }

        function loadConnectionState() {
            if (!vm.connectionState) {
                stationService.getConnectionState().then(function(connectionState) {
                    vm.connectionState = connectionState;
                });
            }
        }

        vm.selectNetworkDevice = function(networkDevice) {
            vm.selectedNetworkDevice = networkDevice;
            vm.connectToNetworkStart();
        };

        vm.connectToNetworkStart = function() {
            vm.step = vm.steps.connectToNetwork;
        };
    }
})();
