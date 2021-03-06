(function() {
    'use strict';

    angular.module('app.user').
        controller('ConnectionController', ConnectionController);

    ConnectionController.$inject = [
        '$q',
        'config',
        'stationService',
        'connectionState',
        '$uibModalInstance',
        'eventDispatcher'];

    function ConnectionController(
        $q, config, station, connectionState, $uibModalInstance,
        eventDispatcher) {
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
        vm.step = vm.steps.selectNetworkDevice;
        vm.close = close;

        activate();

        function activate() {

            var queries = [loadNetworkDevices(), loadConnectionState()];
            $q.all(queries).then(function() {
                for (var i = 0, len = vm.networkDevices.length; i < len; ++i) {
                    if (vm.networkDevices[i].description ===
                        vm.connectionState.description) {
                        vm.connectionState.displayDescription = vm.networkDevices[i].displayDescription;
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

            return station.isServiceCenter().then(function(isServiceCenter) {
                for (var i = 0, len = config.networkDevices.length; i < len; ++i) {
                    if (config.networkDevices[i].isServiceCenterConfig ===
                        isServiceCenter) {
                        vm.networkDevices.push(config.networkDevices[i]);
                    }
                }
            });
        }

        function loadConnectionState() {
            if (!vm.connectionState) {
                return station.getConnectionState().
                    then(function(connectionState) {
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

        vm.ChangeClass = function() {
            if (vm.zoomed) {vm.zoomed = false;}
            else {vm.zoomed = true;}
        };
    }
})();
