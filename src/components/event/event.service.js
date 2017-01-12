(function() {
    'use strict';
    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['$rootScope', 'socketService', '$location', 'toastr', '$state', '$uibModal', 'stationService'];

    function eventService($rootScope, socketService, $location, toastr, $state, $uibModal, stationService) {

        var service = {};

        service.isDeviceNotificationEnabled = true;
        service.connectionNotification = null;
        service.AndroidGuideInProcess = false;
        service.InternetConnection = null;
        var deviceNotiviations = {};

        activate();

        function activate() {
            stationService.getConnectionState().then(function(connectionState) {
                processConnectionState(connectionState);
            });
        }

        function deleteDeviceNotification(deviceId) {
            toastr.clear(deviceNotiviations[deviceId]);
            delete deviceNotiviations[deviceId];
        }

        socketService.on('event', function(event) {

            if (event.name === 'device-add') {
                deleteDeviceNotification(event.data.id); //Prevent duplicate notifications for the same device
                if (service.isDeviceNotificationEnabled) {
                    deviceNotiviations[event.data.id] = toastr.info('Click here to choose what to do with the ' + event.data.type + ' disk.',
                        'Removable ' + event.data.type + ' disk', {
                            'timeOut': 0,
                            'extendedTimeOut': 0,
                            'tapToDismiss': false,
                            'closeButton': true
                        }
                    );
                }
            }

            else if (event.name === 'device-remove') {
                deleteDeviceNotification(event.data.id);
            }

            else if (event.name === 'connection-status') {
                processConnectionState(event.data);
            }

            else if (event.name === 'power-button') {
                openPowerModal();
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
            if (connectionState === null) {
                return;
            }

            if (connectionState.isOnline) {

                if (service.modalWindow) {
                    service.eventDispatcher.dispatch();
                }
                service.InternetConnection = true;
                toastr.clear(service.connectionNotification);
                service.connectionNotification = toastr.success('', {
                    'timeOut': 0,
                    'newest-on-top':false,
                    'extendedTimeOut': 0,
                    'tapToDismiss': false,
                    'closeButton': false
                });
            }

            else {
                toastr.clear(service.connectionNotification);
                service.InternetConnection = false;
                service.connectionNotification = toastr.error('Click here for more information','Station Status: Offline.', {
                    'timeOut': 0,
                    'extendedTimeOut': 0,
                    'tapToDismiss': false,
                    'newest-on-top':false,
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
        function openPowerModal(connectionState) {
            if (service.modalWindow) {
                service.modalWindow.dismiss();
            }

            service.modalWindow = $uibModal.open({templateUrl: 'app/user/shutdown/shutdown.html',
                size: 'sm',
                controller: 'ShutDownController',
                resolve: {connectionState: connectionState, eventDispatcher:service.eventDispatcher},
                controllerAs: 'vm'
            });
        }

        return service;

    }
})();
