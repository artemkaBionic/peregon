(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$q', '$state', 'config', 'stationService', 'inventoryService', 'socketService', '$scope', 'toastr', '$http', 'popupLauncher'];

    function UserController($q, $state, config, stationService, inventoryService, socketService, $scope, toastr, $http, popupLauncher) {
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
        vm.sortReverse = true;
        vm.numberToDisplay = 8;
        vm.limit = 20;
        vm.steps = {
            sessions: {
                name: 'sessions',
                number: 1
            },
            bootDevices: {
                name: 'bootDevices',
                number: 2
            }
        };
        vm.substeps = {
            noBootDevices: {
                name: 'noBootDevices',
                number: 1
            },
            newBootDevice: {
                name: 'newBootDevice',
                number: 2
            },
            bootDevicesProcessing: {
                name: 'bootDevicesProcessing',
                number: 3
            },
            bootDevicesReady: {
                name: 'bootDevicesReady',
                number: 4
            }
        };
        vm.step = vm.steps.sessions;
        vm.substep = vm.substeps.noBootDevices;
        document.getElementById('sessions').style.borderBottom = '3px solid black';
        vm.viewSessions = function(){
            document.getElementById('sessions').style.borderBottom = '3px solid black';
            document.getElementById('bootDevices').style.borderBottom = 'unset';
            vm.step = vm.steps.sessions;
            console.log(vm.step);
        };
        getAllUsbDrives();
        vm.viewBootDevices = function(){
            getAllUsbDrives();
            document.getElementById('bootDevices').style.borderBottom = '3px solid black';
            document.getElementById('sessions').style.borderBottom = 'unset';
            vm.step = vm.steps.bootDevices;
            //console.log(vm.step);
        };
        socketService.on('device-add', function() {
            toastr.success('USB Drive connected to refresh station', {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            document.getElementById('bootDevices').style.borderBottom = '3px solid black';
            document.getElementById('sessions').style.borderBottom = 'unset';
            vm.step = vm.steps.bootDevices;
            vm.substep = vm.substeps.newBootDevice;
            getAllUsbDrives();
        });
        socketService.on('usb-progress', function() {
            getAllUsbDrives();
        });
        socketService.on('usb-complete', function() {
            getAllUsbDrives();
        });
        $scope.$on('$stateChangeSuccess', function() {
            getSessions();
        });
        function getAllUsbDrives(){
            $http.get('/getAllUsbDrives')
                .then(function(response) {
                    vm.usbDrives = response.data;
                    vm.numberOfDevices = 0;
                    vm.notReadyDevices = 0;
                    vm.inProgressDevices = 0;
                    vm.readyDevices = 0;
                    for (var key in vm.usbDrives) {
                        if (vm.usbDrives.hasOwnProperty(key)) {
                            vm.numberOfDevices++;
                            if (vm.numberOfDevices !== 0 && vm.usbDrives[key].status === 'not_ready') {
                                vm.notReadyDevices++;
                            }
                            if (vm.numberOfDevices !== 0 && vm.usbDrives[key].status === 'in_progress') {
                                vm.inProgressDevices++;
                            }
                            if (vm.numberOfDevices !== 0 && vm.usbDrives[key].status === 'ready') {
                                vm.readyDevices++;
                            }
                        }
                    }

                    if (vm.notReadyDevices === 1) {
                        vm.usbText = 'Boot Drive';
                        vm.usbDrivesText = 'Now you can create your Boot Drive.';
                        vm.usbButtonText = 'Create Boot Drive';
                        vm.usbDrivesTitle = vm.notReadyDevices + ' New USB Flash Drive is connected'
                    } else if (vm.notReadyDevices > 1){
                        vm.usbText = 'Boot Drives';
                        vm.usbDrivesTitle = vm.notReadyDevices + ' New USB Flash Drives are connected';
                        vm.usbDrivesText = 'Now you can create your Boot Drives.';
                        vm.usbButtonText = 'Create Boot Drives';
                    }

                    if (vm.readyDevices === vm.numberOfDevices) {
                        vm.substep = vm.substeps.bootDevicesReady;
                    } else if (vm.notReadyDevices > 0) {
                        vm.substep = vm.substeps.newBootDevice;
                    } else if (vm.inProgressDevices > 0) {
                        vm.substep = vm.substeps.bootDevicesProcessing;
                    }

                });
        }
        function getAllNotReadyUsbDrives(){
            console.log('here');
            var deferred = $q.defer();
            var usbIds = [];
            $http.get('/getAllUsbDrives')
                .then(function(response) {
                    for (var key in response.data) {
                        if (response.data.hasOwnProperty(key)) {
                            if (vm.usbDrives[key].status === 'not_ready') {
                                usbIds.push(key);
                                deferred.resolve(usbIds);
                            }
                        }
                    }
                });
            return deferred.promise;
        }
        function prepareUsbDrives(data){
            for (var i = 0; i < data.length; i++) {
                //console.log({usb:data[i]});
                $http({
                    url: '/prepareUsb',
                    method: 'POST',
                    headers: {'content-type': 'application/json'},
                    data: {usb:data[i],item: {}}
                });
            }

        }
        vm.createBootDrives = function(){
            getAllNotReadyUsbDrives().then(function(res) {
                prepareUsbDrives(res);
            });
            vm.substep = vm.substeps.bootDevicesProcessing;
        };
        vm.cancelBootDrive = function(){
            vm.substep = vm.substeps.bootDevicesReady;
        };

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
        $scope.$on('updateList', function(event) {
            getSessions();
        });
        vm.increaseLimit = function() {
            vm.sessionsLength = 0;
            for (var key in vm.sessions) {
                if (vm.sessions.hasOwnProperty(key)) {
                    vm.sessionsLength++;
                }
            }
            if (vm.limit <  vm.sessionsLength) {
                vm.limit += 20;
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
            if ($state.current.name === 'root.user') {
                getSessions().then(function() {
                    toastr.info('Refresh started for device:' + data.data.imei, {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
                });
            }
        });

        socketService.on('android-session-expired', function(data) {
            if ($state.current.name === 'root.user') {
                getSessions().then(function() {
                    toastr.warning('Session expired for device:' + data.device, {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
                });
            }
        });
        socketService.on('session-expired-confirmation', function() {
            if ($state.current.name === 'root.user') {
                getSessions();
            }
        });
        socketService.on('android-reset', function(status) {
            if ($state.current.name === 'root.user') {
                getSessions().then(function() {
                    toastr.info('Refresh finished for device:' + status.imei, {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
                });
            }
        });
        socketService.on('android-remove', function() {
            if ($state.current.name === 'root.user') {
                getSessions();
            }
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
        // jscs:disable

        function updateSessionsForAllDevices(serial){
            inventoryService.getAllSessionsByDevice(serial)
                .then(function(res) {
                    console.log(res);
                    //openHelpModal('xs','Unrecognized Device', res.session_id);
                });
        }
        vm.showGuideForCards = function(session) {
            var item = {'InventoryNumber': session.device.item_number,
                'start_time': session.start_time,
                'serial':session.device.serial_number
            };
            if(session.device.item_number) {
                inventoryService.checkSessionByStartDate(item.start_time)
                    .then(function(res) {
                        if (res.session_id && session.status !== 'Fail') {
                            var $stateParams = {};
                            $stateParams.itemNumber = session.device.item_number;
                            vm.item = null;
                            vm.searchString = '';
                            $state.go('root.user.guide', $stateParams);
                        } else {
                            if (session.status === 'Fail') {
                                if (session.failedTests) {
                                    vm.failedTests = session.failedTests;
                                    if (vm.failedTests.length <= 4) {
                                        openHelpModal('xxs',vm.failedTests);
                                    } else {
                                        openHelpModal('xs',vm.failedTests);
                                    }
                                } else {
                                    if (session.logs[0].message === 'Device is broken') {
                                        vm.failedTests = ['Device is broken.'];
                                        openHelpModal('xxs','Session failed because device is broken.');
                                    } else {
                                        openHelpModal('xxs','Session failed because Android device was unplugged.');
                                    }

                                }
                            } else {
                                openHelpModal('xxs','Device refreshed successfully.');
                            }
                        }
                    });
            } else {
                inventoryService.checkSessionByStartDate(item.start_time)
                    .then(function (res) {
                        console.log(res);
                        openHelpModal('xxxs', 'Unrecognized Device', res.session_id, session);
                    });
            }
        };
        // jscs: enable
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
            var deferred = $q.defer();
            $http.get('/data/getAllSessions/')
                .then(function(response) {
                    vm.sessions =  response.data;
                    deferred.resolve(vm.sessions);
                });
            return deferred.promise;
        }
        function openHelpModal(modalSize, data, sessionId, session) {
            if (typeof(data) === 'string') {
                vm.data = {
                    message: data,
                    sessionId: sessionId,
                    session: session
                };
            } else {
                vm.data = {
                    errors: data
                };
            }
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Message-modal.html',
                controller: 'MessageModalController',
                bindToController: true,
                controllerAs: 'vm',
                resolve: {data:vm.data},
                size: modalSize
            });
        }
    }
})();
