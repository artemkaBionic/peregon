(function() {
    'use strict';

    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['$rootScope', 'socketService', '$location', 'toastr', '$state', 'deviceService'];

    function eventService($rootScope, socketService, $location, toastr, $state, deviceService) {

        var service = {};

        socketService.on('event', function(event) {
            if (event.name === 'device_add') {
                deviceService.addDevice(event.data).then(function() {
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
                });
            }
        });

        socketService.on('device_apply_progress', function(progress) {
            if (progress >= 100) {
                toastr.success('Media has been successfully applied, you may remove the device.',
                    'Apply Media Complete', {
                        'timeOut': 0
                    }
                );
            }
        });

        return service;
    }
})();
