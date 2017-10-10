/**
 * Created by larry on 3/3/2016.
 */
(function() {
    'use strict';

    angular.module('app.inventory').
        factory('inventoryService', inventoryService);

    inventoryService.$inject = ['$q', '$http', 'stationService', 'toastr'];

    function inventoryService($q, $http, stationService, toastr) {

        var service = {};

        service.items = {};

        function isValidItem(item) {
            return item && item.sku;
        }

        var canceller = $q.defer();
        service.getItem = function(id) {
            var url = '/data/inventory/' + id;
            canceller.resolve(null);
            canceller = $q.defer();

            if (isValidItem(service.items[id])) {
                canceller.resolve(service.items[id]);
            } else {
                $http.get(url, {timeout: canceller.promise}).
                    then(function(result) {
                        if (result.data.error) {
                            stationService.getConnectionState().
                                then(function(connectionState) {
                                    if (connectionState.isOnline) {
                                        service.ErrorToast = true;
                                        // toastr.clear(service.ErrorToast);
                                        // service.ErrorToast = toastr.error('Check the ItemNumber','Item not found.', {
                                        //     'timeOut': 2000,
                                        //     'extendedTimeOut': 2000,
                                        //     'tapToDismiss': false,
                                        //     'newest-on-top': false,
                                        //     'closeButton': true
                                        // });
                                        console.log(
                                            'Item number not found. Please check the number and try again.');
                                    } else {
                                        service.ErrorToast = true;
                                        // toastr.clear(service.ErrorToast);
                                        // service.ErrorToast = toastr.error('Refresh Station is Offline','Unable to lookup item', {
                                        //     'timeOut': 2000,
                                        //     'extendedTimeOut': 2000,
                                        //     'tapToDismiss': false,
                                        //     'newest-on-top': false,
                                        //     'closeButton': true
                                        // });
                                        console.log(
                                            'Unable to lookup item because the Station is Offline.');
                                    }
                                });
                        }

                        else if (isValidItem(result.data.item)) {
                            console.log('valid item');
                            service.items[id] = result.data.item;
                            canceller.resolve(result.data.item);
                        }

                        else {
                            canceller.reject();
                            service.ErrorToast = true;
                            // toastr.clear(service.ErrorToast);
                            // service.ErrorToast = toastr.error('Please try again','Item not found', {
                            //     'timeOut': 2000,
                            //     'extendedTimeOut': 2000,
                            //     'tapToDismiss': false,
                            //     'newest-on-top':false,
                            //     'closeButton': true
                            // });
                            console.log('Item not found. Please try again.');
                        }
                    });
            }

            return canceller.promise;
        };

        service.lock = function(imei) {
            var url = '/data/inventory/lock/' + imei;
            var deferred = $q.defer();

            $http.post(url).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.unlock = function(imei, forService) {
            var url = '/data/inventory/unlock/' + imei;
            var deferred = $q.defer();

            $http.post(url, {'forService': forService}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        // TODO: once we will be refactoring session reports for usb only
        // refreshes we'll remove this function and will create generic one
        service.startSession = function(sessionDate, item) {
            var url = '/data/inventory/sessions/' + sessionDate + '/start';
            var deferred = $q.defer();

            $http.post(url, item).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };

        service.updateSessionItem = function(params, item) {
            var deferred = $q.defer();
            $http({
                url: '/updateSessionItem',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: {params: params, item: item}
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        service.updateSession = function(session, level, message, details) {
            var url = '/data/inventory/sessions/update';
            var deferred = $q.defer();

            console.log(message);
            $http.post(url,
                {
                    'session': session,
                    'level': level,
                    'message': message,
                    'details': details
                }).
                then(function(result) {
                    deferred.resolve(result.data);
                });

            return deferred.promise;
        };

        service.finishSession = function(itemNumber, details) {
            var url = '/data/inventory/sessions/' + itemNumber + '/finish';
            var deferred = $q.defer();

            $http.post(url, {'details': details}).then(function(result) {
                deferred.resolve(result.data);
            });

            return deferred.promise;
        };
        service.getSessionByParams = function(params) {
            var deferred = $q.defer();
            $http({
                url: '/getSessionByParams',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: params
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        service.getAllSessionsByParams = function(params) {
            var deferred = $q.defer();
            $http({
                url: '/getSessionsByParams',
                method: 'POST',
                headers: {'content-type': 'application/json'},
                data: params
            }).then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        service.getAllUsbDrives = function() {
            var deferred = $q.defer();
            $http.get('/getAllUsbDrives').then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        service.getLowestUsbInProgress = function() {
            var deferred = $q.defer();
            $http.get('/getLowestUsbInProgress').then(function(result) {
                deferred.resolve(result.data);
            });
            return deferred.promise;
        };
        return service;
    }
})();
