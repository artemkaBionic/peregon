(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ConnectionController', ConnectionController);

    ConnectionController.$inject = ['$stateParams', '$scope', '$q', 'config', 'stationService', 'eventService'];

    function ConnectionController($stateParams, $scope, $q, config, stationService, eventService) {
        /*jshint validthis: true */
        var vm = this;
        vm.selectedNetworkDevice = null;
        vm.connectionState = null;
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

        $scope.$on('$destroy', function(){
            eventService.EnableOfflineNotification();
        });

        activate();

        function activate() {
            eventService.DisableOfflineNotification();
            var queries = [loadNetworkDevices(), loadConnectionState()];
            $q.all(queries).then(function() {
                for (var i = 0; i < config.networkDevices.length; ++i) {
                    if (config.networkDevices[i].description === vm.connectionState.description) {
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
            if ($stateParams.connectionState) {
                vm.connectionState = $stateParams.connectionState;
            } else {
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
