(function() {
    'use strict';

    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['$rootScope', 'socketService', '$location', 'toastr', '$state', 'deviceService'];

    function eventService($rootScope, socketService, $location, toastr, $state, deviceService) {

        var service = {};

        service.isDeviceNotificationEnabled = true;

        socketService.on('event', function(event) {
            if (event.name === 'device-add') {
                deviceService.addDevice(event.data).then(function() {
                    if (service.isDeviceNotificationEnabled) {
                        toastr.info('Tap to choose what to do with the ' + event.data.type + ' disk.',
                            'Removable ' + event.data.type + ' disk', {
                                'timeOut': 0,
                                'onHidden': function(clicked) {
                                    if (clicked) {
                                        var $stateParams = {};
                                        $stateParams.id = event.data.id;
                                        $state.go('root.user.media', $stateParams);
                                    }
                                }
                            }
                        );
                    }
                });
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

        return service;
    }
})();
