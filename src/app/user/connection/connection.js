(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ConnectionController', ConnectionController);

    ConnectionController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance','eventDispatcher'];

    function ConnectionController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance, eventDispatcher) {
        /*jshint validthis: true */
        var vm = this;

        vm.selectedNetworkDevice = null;
        vm.connectionState = connectionState;
        vm.networkDevices = [];
        vm.isPortDetectable = false;
        vm.steps = {
            checkNetwork: {
                name: 'checkNetwork',
                number: 1,
                title: 'Check Network'
            },

            selectNetworkDevice: {
                name: 'selectNetworkDevice',
                number: 2,
                title: 'Select Network Device'
            },
            connectToNetwork: {
                name: 'connectToNetwork',
                number: 3,
                title: 'Connect to Network'
            },
            complete: {
                name: 'complete',
                number: 4,
                title: 'Refresh Station is Connected to the Internet'
            }
        };
        vm.step = vm.steps.checkNetwork;
        vm.close = close;

        activate();
        function activate() {

            var queries = [loadNetworkDevices(), loadConnectionState()];
            $q.all(queries).then(function() {
                for (var i = 0; i < config.networkDevices.length; ++i) {
                    if (config.networkDevices[i].description === vm.connectionState.description) {
                        vm.isPortDetectable = config.networkDevices[i].isPortDetectable;
                        break;
                    }
                }
                eventDispatcher.listen(
                    function() {
                        vm.step = vm.steps.complete;
                        styleChange();
                    }
                );
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
        vm.first = function(networkChecking) {
            vm.step = vm.steps.checkNetwork;
        };

        vm.second = function(networkChecking) {
            vm.step = vm.steps.selectNetworkDevice;
        };

        vm.selectNetworkDevice = function(networkDevice) {
            vm.selectedNetworkDevice = networkDevice;
            vm.connectToNetworkStart();
        };

        vm.connectToNetworkStart = function() {
            vm.step = vm.steps.connectToNetwork;
        };

        vm.moveFirst = function() {
            vm.step = vm.steps.complete;
        };

        vm.moveSecond = function() {
            vm.step = vm.steps.selectNetworkDevice;
        };

        // Style for online change status of Modal Window
        function styleChange() {
            console.log('check');
                $('.modal-offline').addClass('modal-online').removeClass('modal-offline');
        }
    }
})();
