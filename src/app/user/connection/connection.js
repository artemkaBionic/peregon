(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ConnectionController', ConnectionController);

    ConnectionController.$inject = ['$scope', '$q', 'config', 'stationService', 'eventService', 'connectionState', '$uibModalInstance','eventDispatcher','$uibModal'];

    function ConnectionController($scope, $q, config, stationService, eventService, connectionState, $uibModalInstance, eventDispatcher, $uibModal) {
        /*jshint validthis: true */
        var vm = this;
        vm.zoomed = false;
        vm.isFinished = false;
        vm.selectedNetworkDevice = null;
        vm.connectionState = connectionState;
        vm.networkDevices = [];
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
                number: 3,
                title: 'Refresh Station is Connected to the Internet'
            },
            imageShow: {
                name: 'imageShow',
                number: 2,
                title: 'Connect to Network'
            }
        };
        vm.step = vm.steps.connectToNetwork;
        vm.close = close;

        activate();
        function activate() {

            var queries = [loadNetworkDevices(), loadConnectionState()];
            $q.all(queries).then(function() {
                for (var i = 0; i < vm.networkDevices.length; ++i) {
                    if (vm.networkDevices[i].description === vm.connectionState.description) {
                        vm.connectionState.isPortDetectable = vm.networkDevices[i].isPortDetectable;
                        vm.connectToNetworkStart(vm.networkDevices[i]);
                        break;
                    }
                }
                if (vm.networkDevices.length === 1) {
                    vm.connectToNetworkStart(vm.networkDevices[0]);
                }
                eventDispatcher.listen(
                    function() {
                        vm.step = vm.steps.complete;
                        vm.Finish();
                    }
                );
            });
        }

        function close() {
            $uibModalInstance.dismiss('close');
        }

        function loadNetworkDevices() {

            return stationService.isServiceCenter().then(function(isServiceCenter) {
                for (var i = 0; i < config.networkDevices.length; ++i) {
                    if (config.networkDevices[i].isServiceCenterConfig === isServiceCenter) {
                        vm.networkDevices.push(config.networkDevices[i]);
                    }
                }
            });
        }
        function loadConnectionState() {
            if (!vm.connectionState) {
                return stationService.getConnectionState().then(function(connectionState) {
                    vm.connectionState = connectionState;
                });
            }
        }

        vm.selectNetworkDeviceStart = function() {
            vm.step = vm.steps.selectNetworkDevice;
        };

        vm.connectToNetworkStart = function(networkDevice) {
            vm.selectedNetworkDevice = networkDevice;
            vm.step = vm.steps.connectToNetwork;
        };

        vm.Finish = function() {
            vm.isFinished = true;
        };

        vm.ChangeClass = function(){
                if (vm.zoomed){vm.zoomed = false;}
                else {vm.zoomed = true;}
            };
    }
})();
