(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('deviceaddEventService', deviceaddEventService);

    deviceaddEventService.$inject = [];

    function deviceaddEventService() {
        var service = {
            run: run
        };

        return service;

        function run(event) {
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

    }
})();
