(function() {
    'use strict';

    angular.module('app.user').controller('UserController', UserController);

    UserController.$inject = [
        '$q',
        '$state',
        'config',
        'stationService',
        'inventoryService',
        'env',
        '$scope',
        'toastr',
        '$http',
        'popupLauncher'];

    function UserController(
        $q, $state, config, stationService, inventoryService, env, $scope,
        toastr, $http, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        var socket = io.connect('http://' + env.baseUrl);
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
        vm.usbData = {};
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
        document.getElementById(
            'sessions').style.borderBottom = '3px solid black';
        vm.viewSessions = function() {
            document.getElementById(
                'sessions').style.borderBottom = '3px solid black';
            document.getElementById('bootDevices').style.borderBottom = 'unset';
            vm.step = vm.steps.sessions;
            console.log(vm.step);
        };
        //getAllUsbDrives();
        vm.viewBootDevices = function() {
            getAllUsbDrives();
            document.getElementById(
                'bootDevices').style.borderBottom = '3px solid black';
            document.getElementById('sessions').style.borderBottom = 'unset';
            vm.step = vm.steps.bootDevices;
            //console.log(vm.step);
        };
        socket.on('device-add', function() {
            toastr.success('USB Drive connected to refresh station', {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            document.getElementById(
                'bootDevices').style.borderBottom = '3px solid black';
            document.getElementById('sessions').style.borderBottom = 'unset';
            vm.step = vm.steps.bootDevices;
            vm.substep = vm.substeps.newBootDevice;
            getAllUsbDrives();
        });
        socket.on('usb-progress', function() {
            console.log('in progress');
            getAllUsbDrives();
        });
        socket.on('usb-complete', function() {
            getAllUsbDrives();
        });
        $scope.$on('$stateChangeSuccess', function() {
            getSessions();
        });
        function getAllUsbDrives(){
            inventoryService.getAllUsbDrives().then(function(usbDrives){
                vm.usbData = usbDrives.usbData;
                console.log(vm.usbData);
                vm.substep = vm.substeps[usbDrives.usbData.status];
            });
        }
        vm.createBootDrives = function() {
            $http({
                url: '/prepareUsb',
                method: 'POST',
                headers: {'content-type': 'application/json'}
            });
            vm.substep = vm.substeps.bootDevicesProcessing;
        };
        vm.cancelBootDrive = function() {
            vm.substep = vm.substeps.bootDevicesReady;
        };

        $scope.$watch('vm.textToFilter', function(newTextToFilter) {
            $scope.$watch('vm.sessionType', function(newDropdown, oldDropdown) {
                var dropDownChoice = newDropdown ? newDropdown : oldDropdown;
                if (newTextToFilter) {
                    vm.filterParam = dropDownChoice.replace(/\s/g, '').
                        concat(' ').
                        concat(newTextToFilter);
                } else {
                    vm.filterParam = dropDownChoice.replace(/\s/g, '');
                }
            });
        });
        $scope.$on('updateList', function() {
            setTimeout(function() {
                getSessions();
            }, 500);
        });

        vm.increaseLimit = function() {
            vm.sessionsLength = 0;
            for (var key in vm.sessions) {
                if (vm.sessions.hasOwnProperty(key)) {
                    vm.sessionsLength++;
                }
            }
            if (vm.limit < vm.sessionsLength) {
                vm.limit += 20;
            }
        };
        var container = angular.element(
            document.querySelector('.content-full-height-scroll'));
        container.on('scroll', function() {
            var divAnchor = document.querySelector('#Header-anchor');
            var divHeader = angular.element(document.getElementById('Header'));
            var col1 = angular.element(document.getElementById('col1'));
            var col2 = angular.element(document.getElementById('col2'));
            var col3 = angular.element(document.getElementById('col3'));
            var col4 = angular.element(document.getElementById('col4'));
            var col5 = angular.element(document.getElementById('col5'));
            var col6 = angular.element(document.getElementById('col6'));
            var col7 = angular.element(document.getElementById('col7'));
            var background = angular.element(
                document.getElementById('background'));
            var windowScrollTop = divHeader[0].getBoundingClientRect().top;
            if (windowScrollTop <= divAnchor.offsetTop) {
                col1.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col2.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col3.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col4.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col5.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col6.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                col7.attr('style',
                    'height:40px;position:fixed;top:0vh;z-index:400');
                background.attr('style',
                    'background-color:#f5f5f5;position:fixed;top:0vh;z-index:390;left:0;width:95%;height:33px;margin-top:-7px');
            } else {
                col1.attr('style', 'position:"";top:"";z-index:300');
                col2.attr('style', 'position:"";top:"";z-index:300');
                col3.attr('style', 'position:"";top:"";z-index:300');
                col4.attr('style', 'position:"";top:"";z-index:300');
                col5.attr('style', 'position:"";top:"";z-index:300');
                col6.attr('style', 'position:"";top:"";z-index:300');
                col7.attr('style', 'position:"";top:"";z-index:300');
                background.attr('style',
                    'background-color:"";position:"";top:"";z-index:300');
            }
        });
        //'Fail', 'Incomplete'
        vm.filterParam = vm.textToFilter;
        vm.searchStringChange = function() {
            vm.searchString = vm.searchString.toUpperCase();
            if (vm.searchString !== vm.lastValidSearchString) {
                vm.searchStringError = false;
                vm.itemNumberError = false;
                vm.searchStringSkuWarning = config.partialSkuRegEx.test(
                    vm.searchString);
                if (config.partialItemNumberRegEx.test(vm.searchString)) {
                    vm.lastValidSearchString = vm.searchString;
                    if (config.itemNumberRegEx.test(vm.searchString)) {
                        vm.item = null;
                        inventoryService.getItem(vm.searchString).
                            then(function(item) {
                                vm.item = item;
                                vm.itemNumberError = false;
                                // enable keypad submit button
                                $('.bc-keypad__key-button--submit').
                                    addClass('bc-keypad-submit-enabled');
                            }, function() {
                                if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                    vm.itemNumberError = true;
                                }
                            });
                    } else {
                        // disable keypad submit button
                        if ($('.bc-keypad__key-button--submit').
                                hasClass('bc-keypad-submit-enabled')) {
                            $('.bc-keypad__key-button--submit').
                                removeClass('bc-keypad-submit-enabled');
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
        vm.changeFilter = function(filter) {
            vm.sessionType = filter;
        };

        getSessions();
        socket.on('app-start', function(session) {
            console.log(session);
            getSessions().then(function() {
                // jscs:disable
                toastr.info('Refresh started for device:' +
                    session.device.serial_number, {
                    'tapToDismiss': true,
                    'timeOut': 3000,
                    'closeButton': true
                });
                // jscs:enable
            });
        });

        socket.on('android-session-expired', function(data) {
            if ($state.current.name === 'root.user') {
                getSessions().then(function() {
                    toastr.warning('Session expired for device:' + data.device,
                        {
                            'tapToDismiss': true,
                            'timeOut': 3000,
                            'closeButton': true
                        });
                });
            }
        });
        socket.on('session-expired-confirmation', function() {
            if ($state.current.name === 'root.user') {
                getSessions();
            }
        });
        socket.on('android-reset', function(session) {
            console.log(session);
            getSessions().then(function() {
                // jscs:disable
                toastr.info('Refresh finished for device:' +
                    session.device.serial_number, {
                    'tapToDismiss': true,
                    'timeOut': 3000,
                    'closeButton': true
                });
                // jscs:enable
            });
        });
        socket.on('android-remove', function() {
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

        vm.showGuideForCards = function(session) {
            var item = {'InventoryNumber': session.device.item_number,
                'start_time': session.start_time,
                'serial':session.device.serial_number,
                'id':session._id
            };
            if(session.device.item_number) {
                inventoryService.getSessionByParams({'_id':session._id})
                    .then(function(res) {
                        if (res._id && session.status === 'Incomplete') {
                            var $stateParams = {};
                            $stateParams.itemNumber = session.device.item_number;
                            $stateParams.sessionId = res._id;
                            vm.item = null;
                            vm.searchString = '';
                            $state.go('root.user.guide', $stateParams);
                        } else if (session.status === 'Fail') {
                            if (session.failedTests && session.failedTests.length > 0) {
                                vm.failedTests = session.failedTests;
                                if (vm.failedTests.length <= 4) {
                                    openHelpModal('xxs',vm.failedTests);
                                } else {
                                    openHelpModal('sm-to-xs',vm.failedTests);
                                }
                            } else {
                                if (session.logs.length > 0) {
                                    var isBroken = false;
                                    var sessionExpired = false;
                                    for (var i = 0; i < session.logs.length; i++) {
                                        if (session.logs[i].message === 'Device is broken') {
                                            isBroken = true;
                                        } else if (session.logs[i].message === 'Session expired') {
                                            sessionExpired = true;
                                        }
                                    }
                                    if (isBroken) {
                                        openHelpModal('xxs', 'Session failed because device is broken.');
                                    } else if (sessionExpired) {
                                        openHelpModal('xxs', 'Refresh is not successfull because session expired.');
                                    }
                                } else {
                                    openHelpModal('xxs', 'Session failed because device was unplugged.');
                                }
                            }
                        } else {
                            openHelpModal('xxs','Device refreshed successfully.');
                        }
                    });
            } else {
                inventoryService.getSessionByParams({'_id':session._id})
                    .then(function (res) {
                        openHelpModal('sm-to-xs', 'Unrecognized Device', res._id, session);
                    });
            }
        };
        // jscs: enable
        vm.unlockForService = function() {
            if (vm.item) {
                inventoryService.unlock(vm.item.Serial, true).
                    then(function(data) {
                        if (data.error) {
                            toastr.error(
                                'Failed to unlock device. Please try again. If the problem continues, contact support.',
                                'Device NOT Unlocked', {
                                    'tapToDismiss': true,
                                    'timeOut': 10000,
                                    'closeButton': true
                                });
                        } else {
                            toastr.info('Device is unlocked by ' +
                                data.result.service, 'Device Unlocked', {
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
        //=========== End Working on catching the Android Connect before ItemNumber entered==========
        activate();

        function activate() {
            var queries = [
                stationService.isServiceCenter().
                    then(function(isServiceCenter) {
                        vm.isServiceCenter = isServiceCenter;
                    })];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function getSessions() {
            var deferred = $q.defer();
            inventoryService.getAllSessionsByParams({}).then(function(sessions) {
                vm.sessions =  sessions;
                deferred.resolve(sessions);
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
                templateUrl: 'app/user/guide/Modals/Session-Status-modal.html',
                controller: 'SessionStatusModalController',
                bindToController: true,
                controllerAs: 'vm',
                resolve: {data: vm.data},
                size: modalSize
            });
        }
    }
})();
