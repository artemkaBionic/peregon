(function() {
    'use strict';

    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['$rootScope', 'socketService', '$location', 'toastr', '$state', '$uibModal', 'deviceService'];

    function eventService($rootScope, socketService, $location, toastr, $state, $uibModal, deviceService) {

        var service = {};

        service.isDeviceNotificationEnabled = true;
        service.isOfflineNotificationEnabled = true;
        var offlineNotification = null;
        toastr.clear(offlineNotification);

        socketService.on('event', function(event) {
            if (event.name === 'device-add') {
                deviceService.addDevice(event.data).then(function() {
                    if (service.isDeviceNotificationEnabled) {
                        toastr.info('Tap to choose what to do with the ' + event.data.type + ' disk.',
                            'Removable ' + event.data.type + ' disk', {
                                'timeOut': 0,
                                'onHidden': function(clicked) {
                                    if (clicked) {
                                        $state.go('root.user.media', {
                                            'id': event.data.id
                                        });
                                    }
                                }
                            }
                        );
                    }
                });
            }

            else if (event.name === 'connection-status') {
                if (event.data.isOnline) {
                    if (service.modalWindow) {
                        service.modalWindow.dismiss();
                    }
                    var offlineNotification = null;
                    toastr.clear();
                    if (service.isOfflineNotificationEnabled) {
                        offlineNotification = toastr.success('Station Status: Online', {
                                'timeOut': 0,
                                'extendedTimeOut': 0,
                                'tapToDismiss': false,
                                'closeButton': false
                                // 'onShown':
                            }
                        );

                    }

                }

                else {
                    if (service.isOfflineNotificationEnabled) {
                        offlineNotification = null;
                        toastr.clear();
                        offlineNotification = toastr.error('Not connected', {
                            'timeOut': 0,
                            'extendedTimeOut': 0,
                            'tapToDismiss': false,
                            'closeButton': false,
                            'onShown': function() {
                                openModal(event);
                            },
                            'onTap': function() {
                                openModal(event);
                            }
                            // $state.go('root.connection', {
                            //    'connectionState': event.data
                            // });
                        });
                    }

                }
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

        service.EnableOfflineNotification = function() {
            service.isOfflineNotificationEnabled = true;
        };

        service.DisableOfflineNotification = function() {
            service.isOfflineNotificationEnabled = false;
        };

       function openModal(event) {
           if (service.modalWindow) {
               service.modalWindow.dismiss();
           }
           service.modalWindow = $uibModal.open({templateUrl: 'app/user/connection/connection.html',
               controller: 'ConnectionController',
               bindToController: true,
               resolve: {connectionState: event.data},
               controllerAs: 'vm',
               size: 'lg'
           });
       }

        return service;
    }
})();
