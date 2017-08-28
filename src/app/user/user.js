(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$window','$q', '$state', 'config', 'stationService', 'inventoryService', 'socketService', '$scope', 'toastr', '$http'];

    function UserController($window, $q, $state, config, stationService, inventoryService, socketService, $scope, toastr, $http) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        vm.searchString = '';
        vm.lastValidSearchString = '';
        vm.item = null;
        vm.AndroidEmei = null;
        vm.itemNumberError = false;
        vm.searchStringError = false;
        vm.searchStringSkuWarning = false;
        vm.isServiceCenter = false;
        vm.sessionType = 'All Sessions';
        vm.sessions = [];
        vm.sortType = 'start_time';
        vm.sortReverse = false;
        vm.numberToDisplay = 8;
        $scope.$watch('vm.textToFilter',function(newTextToFilter){
             $scope.$watch('vm.sessionType', function(newDropdown, oldDropdown){
                 var dropDownChoice = newDropdown ? newDropdown : oldDropdown;
                 if (newTextToFilter) {
                     vm.filterParam = dropDownChoice.replace(/\s/g, '').concat(' ').concat(newTextToFilter);
                 } else {
                     vm.filterParam = dropDownChoice.replace(/\s/g, '');
                 }
             });
        });
        var input = {
            "0000000000": {
                device: {
                    item_number: "0000000000",
                    manufacturer: "WSA DISTRIBUTING",
                    model: "Samsung Note 4",
                    serial_number: "352149076335834",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            },
            "1111111111": {
                device: {
                    item_number: "1111111111",
                    manufacturer: "Samsung",
                    model: "Samsung Note 5",
                    serial_number: "12311233123123",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2013-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            },
            "2222222222": {
                device: {
                    item_number: "2222222222",
                    manufacturer: "HP",
                    model: "Laptop x1123",
                    serial_number: "444123123333123",
                    sku: "7393SN4",
                    type: "Windows"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2013-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            },
            "33333333333": {
                device: {
                    item_number: "33333333333",
                    manufacturer: "HP",
                    model: "Laptop A-1333",
                    serial_number: "4423455554345555",
                    sku: "7393SN4",
                    type: "Windows"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:55.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            }
            ,
            "44444444444": {
                device: {
                    item_number: "44444444444",
                    manufacturer: "Meizu",
                    model: "M2 minu",
                    serial_number: "5151555111555555",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:51.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            },
            "55555555555": {
                device: {
                    item_number: "55555555555",
                    manufacturer: "Meizu",
                    model: "M2 mini",
                    serial_number: "54355515555555553",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            }, "666666666666": {
                device: {
                    item_number: "666666666666",
                    manufacturer: "Microsoft",
                    model: "X-Box 360",
                    serial_number: "54355515555555551",
                    sku: "7393SN4",
                    type: "X-box"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            }, "7777777777777": {
                device: {
                    item_number: "7777777777777",
                    manufacturer: "LG",
                    model: "LG Smart TV",
                    serial_number: "54355515555555552",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:11.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            }, "888888888888": {
                device: {
                    item_number: "888888888888",
                    manufacturer: "LG",
                    model: "LG Smart TV",
                    serial_number: "54355515555555551",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:11.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Incomplete"
            }, "99999999999": {
                device: {
                    item_number: "99999999999",
                    manufacturer: "Sharp",
                    model: "Sharp Smart TV",
                    serial_number: "54355515555555550",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:15.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Incomplete"
            },"0000000001": {
                device: {
                    item_number: "0000000000",
                    manufacturer: "WSA DISTRIBUTING",
                    model: "Samsung Note 4",
                    serial_number: "352149076335834",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            },
            "1111111112": {
                device: {
                    item_number: "1111111111",
                    manufacturer: "Samsung",
                    model: "Samsung Note 5",
                    serial_number: "12311233123123",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2013-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            },
            "2222222223": {
                device: {
                    item_number: "2222222222",
                    manufacturer: "HP",
                    model: "Laptop x1123",
                    serial_number: "444123123333123",
                    sku: "7393SN4",
                    type: "Windows"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2013-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            },
            "33333333334": {
                device: {
                    item_number: "33333333333",
                    manufacturer: "HP",
                    model: "Laptop A-1333",
                    serial_number: "4423455554345555",
                    sku: "7393SN4",
                    type: "Windows"
                },
                diagnose_only: false,
                end_time: "2013-08-25T13:17:08.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:55.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            }
            ,
            "44444444445": {
                device: {
                    item_number: "44444444444",
                    manufacturer: "Meizu",
                    model: "M2 minu",
                    serial_number: "5151555111555555",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:51.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            },
            "55555555556": {
                device: {
                    item_number: "55555555555",
                    manufacturer: "Meizu",
                    model: "M2 mini",
                    serial_number: "54355515555555553",
                    sku: "7393SN4",
                    type: "Android"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Success"
            }, "66666666667": {
                device: {
                    item_number: "666666666666",
                    manufacturer: "Microsoft",
                    model: "X-Box 360",
                    serial_number: "54355515555555551",
                    sku: "7393SN4",
                    type: "X-box"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:10.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            }, "777777777778": {
                device: {
                    item_number: "7777777777777",
                    manufacturer: "LG",
                    model: "LG Smart TV",
                    serial_number: "54355515555555552",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:11.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Fail"
            }, "88888888889": {
                device: {
                    item_number: "888888888888",
                    manufacturer: "LG",
                    model: "LG Smart TV",
                    serial_number: "54355515555555551",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:11.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Incomplete"
            }, "9999999990": {
                device: {
                    item_number: "99999999999",
                    manufacturer: "Sharp",
                    model: "Sharp Smart TV",
                    serial_number: "54355515555555550",
                    sku: "7393SN4",
                    type: "TV OS 123"
                },
                diagnose_only: false,
                end_time: "2017-08-25T13:17:15.044Z",
                logs: [],
                start_time: "2017-08-25T13:15:53.313Z",
                station: {name: "station7446a09dac51", service_tag: "2UA3340ZS6"},
                status: "Incomplete"
            }
        };
        $scope.limit = 10;
        vm.dummySessions = Object.keys(input).map(function(key) { return input[key]; });
        $scope.increaseLimit = function () {
            if ($scope.limit <  vm.dummySessions.length) {
                $scope.limit += 15;
            }
        };
        var container = angular.element(document.querySelector('.content-full-height-scroll'));
        container.on('scroll', function(){
            var divAnchor = document.querySelector('#Header-anchor');
            var divHeader = angular.element(document.getElementById('Header'));
            var col1 = angular.element(document.getElementById('col1'));
            var col2 = angular.element(document.getElementById('col2'));
            var col3 = angular.element(document.getElementById('col3'));
            var col4 = angular.element(document.getElementById('col4'));
            var col5 = angular.element(document.getElementById('col5'));
            var col6 = angular.element(document.getElementById('col6'));
            var col7 = angular.element(document.getElementById('col7'));
            var background = angular.element(document.getElementById('background'));
            var windowScrollTop = divHeader[0].getBoundingClientRect().top;
            if (windowScrollTop <= divAnchor.offsetTop) {
                col1.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col2.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col3.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col4.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col5.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col6.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                col7.attr('style','height:40px;position:fixed;top:0vh;z-index:400');
                background.attr('style','background-color:#f5f5f5;position:fixed;top:0vh;z-index:390;left:0;width:95%;height:33px;margin-top:-7px');
            } else {
                col1.attr('style','position:"";top:"";z-index:300');
                col2.attr('style','position:"";top:"";z-index:300');
                col3.attr('style','position:"";top:"";z-index:300');
                col4.attr('style','position:"";top:"";z-index:300');
                col5.attr('style','position:"";top:"";z-index:300');
                col6.attr('style','position:"";top:"";z-index:300');
                col7.attr('style','position:"";top:"";z-index:300');
                background.attr('style','background-color:"";position:"";top:"";z-index:300');
            }
        });
        //'Fail', 'Incomplete'
        vm.filterParam = vm.textToFilter;
        vm.searchStringChange = function() {
            vm.searchString = vm.searchString.toUpperCase();
            if (vm.searchString !== vm.lastValidSearchString) {
                vm.searchStringError = false;
                vm.itemNumberError = false;
                vm.searchStringSkuWarning = config.partialSkuRegEx.test(vm.searchString);
                if (config.partialItemNumberRegEx.test(vm.searchString)) {
                    vm.lastValidSearchString = vm.searchString;
                    if (config.itemNumberRegEx.test(vm.searchString)) {
                        vm.item = null;
                        inventoryService.getItem(vm.searchString).then(function(item) {
                            vm.item = item;
                            vm.itemNumberError = false;
                            // enable keypad submit button
                            $('.bc-keypad__key-button--submit').addClass('bc-keypad-submit-enabled');
                        }, function() {
                            if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                vm.itemNumberError = true;
                            }
                        });
                    } else {
                        // disable keypad submit button
                        if ($('.bc-keypad__key-button--submit').hasClass('bc-keypad-submit-enabled')) {
                            $('.bc-keypad__key-button--submit').removeClass('bc-keypad-submit-enabled');
                        }
                        vm.item = null;
                    }
                } else {
                    vm.searchString = vm.lastValidSearchString;
                    if (vm.item === null) {
                        vm.searchStringError = true;
                    }
                }
            }
        };
        $scope.$watch('vm.searchString', vm.searchStringChange);
        vm.changeFilter = function(filter){
            vm.sessionType = filter;
        };

        getSessions();
        socketService.on('app-start', function(data) {
            toast(data.data.InventoryNumber);
            getSessions();
        });

        socketService.on('android-reset', function(status) {
            toastr.info('Refresh finished for device:' + status.itemNumber, {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            getSessions();
        });
        vm.showGuide = function() {
            if (vm.item !== null) {
                var $stateParams = {};
                $stateParams.itemNumber = vm.item.InventoryNumber;
                vm.item = null;
                vm.searchString = '';
                $state.go('root.user.guide', $stateParams);
            }
        };

        //console.log(vm.dummySessions);

        vm.unlockForService = function() {
            if (vm.item) {
                inventoryService.unlockForService(vm.item.Serial).then(function(data) {
                    if (data.error) {
                        toastr.error('Failed to unlock device. Please try again. If the problem continues, contact support.', 'Device NOT Unlocked', {
                            'tapToDismiss': true,
                            'timeOut': 10000,
                            'closeButton': true
                        });
                    } else {
                        toastr.info('Device is unlocked by ' + data.result.service, 'Device Unlocked', {
                            'tapToDismiss': true,
                            'timeOut': 3000,
                            'closeButton': true
                        });
                        vm.item = null;
                        vm.searchString = '';
                    }
                });
            }
        };

        //=========== Start Working on catching the Android Connect before ItemNumber entered==========
        socketService.on('app-start', function(data) {
            // if (!eventService.AndroidGuideInProcess) {
            //    // =======Code for getting SKU when the Android EMEI is known========
            //     vm.AndroidEmei = event.data.emei;
            //     console.log(data.emei);
            //     inventoryService.getItem(vm.AndroidEmei).then(function(item) {
            //         vm.item = item;
            //     });
            //     vm.showGuide();
            //     console.log('User.js Event app-start');
            //
            // }

        });
        //=========== End Working on catching the Android Connect before ItemNumber entered==========
        activate();
        function activate() {
            var queries = [stationService.isServiceCenter().then(function(isServiceCenter) {
                vm.isServiceCenter = isServiceCenter;
            })];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }
        function getSessions(){
            $http.get('/data/getAllSessions/')
                .then(function(response) {
                    vm.sessions =  response.data;
                    console.log(response.data);
                });
        }
        function toast(deviceid){
            toastr.info('Refresh started for device:' + deviceid, {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
        }
    }
})();
