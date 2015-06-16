(function() {
    'use strict';

    angular
        .module('app.event')
        .factory('eventService', eventService);

    eventService.$inject = ['socketService', '$location', 'notificationService'];

    function eventService(socketService, $location, notificationService) {

        var service = {};

        socketService.on('event', function(event) {
            if (event.name === 'media_add') {
                notificationService.success('A ' + event.data.mediaType + ' device is detected.');
                //$location.path('/media/' + event.data.mediaType);
            }
        });

        return service;
    }
})();
