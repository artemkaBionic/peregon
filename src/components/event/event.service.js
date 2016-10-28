(function() {
    'use strict';

    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['$rootScope', 'socketService', '$location', 'toastr', '$state', '$uibModal', 'deviceService', 'stationService'];

    function eventService($rootScope, socketService, $location, toastr, $state, $uibModal, deviceService, stationService) {

        var service = {};

        service.isDeviceNotificationEnabled = true;
        var connectionNotification = null;
        var deviceNotiviations = {};

        activate();

        function activate() {
            stationService.getConnectionState().then(function(connectionState) {
                processConnectionState(connectionState);
            });
        }

        socketService.on('event', function(event) {
            if (event.name === 'device-add') {
                deviceService.addDevice(event.data).then(function() {
                    if (service.isDeviceNotificationEnabled) {
                        deviceNotiviations[event.data.id] = toastr.info('Click here to choose what to do with the ' + event.data.type + ' disk.',
                            'Removable ' + event.data.type + ' disk', {
                                'timeOut': 0,
                                'extendedTimeOut': 0,
                                'tapToDismiss': false,
                                'closeButton': false,
                                'onTap': function() {
                                    $state.go('root.media', {
                                        'id': event.data.id
                                    });
                                }
                            }
                        );
                    }
                });
            }

            else if (event.name === 'device-remove') {
                deviceService.removeDevice(event.data.id);
                toastr.clear(deviceNotiviations[event.data.id]);
                delete deviceNotiviations[event.data.id];
            }

            else if (event.name === 'connection-status') {
                processConnectionState(event.data);
            }
        });

        socketService.on('device-apply-progress', function(data) {
            if (data.progress >= 100) {
                if (service.isDeviceNotificationEnabled) {
                    var toast = toastr.success('Media has been successfully applied, you may remove the device.',
                        'Apply Media Complete', {
                            'timeOut': 0
                        }
                    );
                    socketService.once('event', function(event) {
                        if (event.name === 'device-remove' && event.data.id === data.device.id) {
                            toastr.clear(toast);
                        }
                    });
                }
            }
        });

        service.EnableDeviceNotification = function() {
            service.isDeviceNotificationEnabled = true;
        };

        service.DisableDeviceNotification = function() {
            service.isDeviceNotificationEnabled = false;
        };

        function processConnectionState(connectionState) {
            if (connectionState.isOnline) {

                if (service.modalWindow) {
                    service.eventDispatcher.dispatch();
                }

                toastr.clear(connectionNotification);
                connectionNotification = toastr.success('Currently Connected to Internet','Station Status: Online', {
                    'timeOut': 0,
                    'extendedTimeOut': 0,
                    'tapToDismiss': false,
                    'closeButton': false
                    // 'onShown':
                });
            }

            else {
                toastr.clear(connectionNotification);
                connectionNotification = toastr.error('Click here for more information','Station Status: Offline.', {
                    'timeOut': 0,
                    'extendedTimeOut': 0,
                    'tapToDismiss': false,
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

       function openModal(connectionState) {
           if (service.modalWindow) {
               service.modalWindow.dismiss();
           }

           service.eventDispatcher = {
              listen: function(callback) {
               this._callback = callback;
           },
            dispatch: function() {
               this._callback();
           }
           };

           service.modalWindow = $uibModal.open({templateUrl: 'app/user/connection/connection.html',
               controller: 'ConnectionController',
               bindToController: true,
               resolve: {connectionState: connectionState, eventDispatcher:service.eventDispatcher},
               controllerAs: 'vm',
               size: 'lg'
           });
       }

        return service;
    }
})();
