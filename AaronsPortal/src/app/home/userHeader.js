(function() {
    'use strict';

    angular
        .module('app')
        .controller('UserHeaderController', UserHeaderController);

    UserHeaderController.$inject = ['$q', '$log', 'stationService', 'socketService', '$uibModal', 'toastr'];

    function UserHeaderController($q, $log, station, socket, $uibModal, toastr) {
        /*jshint validthis: true */
        var vm = this;
        vm.currentUser = undefined;
        vm.InternetConnection = false;
        var modalWindow;
        var eventDispatcher;
        var connectionNotification;

        socket.on('connection-status', processConnectionState);
        socket.on('power-button', openPowerModal);

        function processConnectionState(connectionState) {
            if (connectionState !== null) {
                vm.InternetConnection = connectionState.isOnline;

                if (vm.InternetConnection) {
                    if (modalWindow) {
                        eventDispatcher.dispatch();
                    }
                    toastr.clear(connectionNotification);
                } else {
                    toastr.clear(connectionNotification);
                    connectionNotification = toastr.error(
                        'Click here for more information',
                        'Station Status: Offline.', {
                            'timeOut': 0,
                            'extendedTimeOut': 0,
                            'tapToDismiss': false,
                            'newest-on-top': false,
                            'closeButton': false,
                            'onShown': function() {
                                openModal(connectionState);
                            },
                            'onTap': function() {
                                openModal(connectionState);
                            }
                        });
                }
            }
        }

        function openModal(connectionState) {
            if (modalWindow) {
                modalWindow.dismiss();
            }

            eventDispatcher = {
                listen: function(callback) {
                    this._callback = callback;
                },
                dispatch: function() {
                    this._callback();
                }
            };

            modalWindow = $uibModal.open({
                templateUrl: 'app/user/connection/connection.html',
                controller: 'ConnectionController',
                bindToController: true,
                resolve: {
                    connectionState: connectionState,
                    eventDispatcher: eventDispatcher
                },
                controllerAs: 'vm',
                size: 'lg'
            });
        }

        function openPowerModal(connectionState) {
            if (modalWindow) {
                modalWindow.dismiss();
            }

            modalWindow = $uibModal.open({
                templateUrl: 'app/user/shutdown/shutdown.html',
                size: 'sm',
                controller: 'ShutDownController',
                resolve: {
                    connectionState: connectionState,
                    eventDispatcher: eventDispatcher
                },
                controllerAs: 'vm'
            });
        }

        activate();
        function activate() {
            var queries = [getUser(), station.getConnectionState().then(processConnectionState)];
            return $q.all(queries).then(function() {
                $log.info('Activated User View');
            });
        }

        function getUser() {
            var user = {name: 'admin'};
            return $q.when(user)
                .then(assignData);

            function assignData(data) {
                vm.currentUser = data;
            }
        }
    }
})();
