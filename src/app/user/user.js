(function() {
    'use strict';

    angular.module('app.user').controller('UserController', UserController);

    UserController.$inject = [
        '$q',
        '$state',
        'config',
        'stationService',
        'inventoryService',
        'sessionsService',
        'socketService',
        '$scope',
        'toastr',
        'popupLauncher'];

    function UserController(
        $q, $state, config, station, inventory, sessions,
        socket, $scope,
        toastr, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        vm.searchString = '';
        vm.lastValidSearchString = '';
        vm.item = null;
        vm.AndroidEmei = null;
        vm.itemNumberError = false;
        vm.itemUnsupportedError = false;
        vm.searchStringError = false;
        vm.searchStringSkuWarning = false;
        vm.isServiceCenter = false;
        vm.sessionType = 'All Sessions';
        vm.sessions = [];
        vm.sortType = 'start_time';
        vm.sortReverse = true;
        vm.numberToDisplay = 8;
        vm.usbDrives = {};
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
        vm.step = vm.steps.sessions;
        getSessions();
        displayBanner();

        function getSessions() {
            var deferred = $q.defer();
            sessions.getAllSessionsByParams({}).then(function(sessions) {
                vm.sessions = sessions;
                deferred.resolve(sessions);
            });
            return deferred.promise;
        }

        function updateSession(session) {
            var sessionsArrayLength = vm.sessions.length;
            var updated = false;
            for (var i = 0; i < sessionsArrayLength; i++) {
                if (vm.sessions[i]._id === session._id) {
                    vm.sessions[i] = session;
                    updated = true;
                }
            }
            if (!updated) {
                vm.sessions.push(session);
            }
        }

        vm.viewSessions = function() {
            document.getElementById(
                'sessions').style.borderBottom = '3px solid black';
            document.getElementById('bootDevices').style.borderBottom = 'unset';
            vm.step = vm.steps.sessions;
        };
        vm.viewBootDevices = function() {
            document.getElementById(
                'bootDevices').style.borderBottom = '3px solid black';
            document.getElementById('sessions').style.borderBottom = 'unset';
            vm.step = vm.steps.bootDevices;
        };
        vm.viewSessions();
        // $scope.$on('$stateChangeSuccess', function() {
        //     getSessions();
        // });
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
        $scope.$on('showModal', function() {
            vm.openSurveyModal();
        });
        $scope.$on('showFeedbackButton', function() {
            vm.showBanner = false;
        });
        // used for infinite scroll
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
        // this used make header of sessions table fixed on top is scroll
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
        // filtering session data
        vm.filterParam = vm.textToFilter;
        vm.changeFilter = function(filter) {
            vm.sessionType = filter;
        };
        // get item number
        vm.searchStringChange = function() {
            vm.searchString = vm.searchString.toUpperCase();
            if (vm.searchString !== vm.lastValidSearchString) {
                vm.searchStringError = false;
                vm.itemNumberError = false;
                vm.itemUnsupportedError = false;
                vm.searchStringSkuWarning = config.partialSkuRegEx.test(vm.searchString);
                if (config.partialItemNumberRegEx.test(vm.searchString)) {
                    vm.lastValidSearchString = vm.searchString;
                    if (config.itemNumberRegEx.test(vm.searchString)) {
                        vm.item = null;
                        inventory.getItem(vm.searchString).
                            then(function(item) {
                                if (item) {
                                    vm.item = item;
                                    vm.itemNumberError = false;
                                    vm.itemUnsupportedError = false;
                                    if (!vm.item.type || vm.item.type === 'Unsupported') {
                                        vm.itemUnsupportedError = true;
                                    }
                                } else {
                                    if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                        vm.itemNumberError = true;
                                        vm.itemUnsupportedError = false;
                                    }
                                }
                            }, function() {
                                if (vm.item === null) { // If vm.item is populated then a successful call to getItem was completed before this failure was returned.
                                    vm.itemNumberError = true;
                                    vm.itemUnsupportedError = false;
                                }
                            });
                    } else {
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
        // show guides
        vm.showGuide = function() {
            if (vm.item !== null) {
                var $stateParams = {};
                $stateParams.itemNumber = vm.item.item_number;
                mixpanel.track(
                    'Session Start',
                    {
                        'item_type': vm.item.type,
                        'item_number': vm.item.item_number
                    }
                );
                vm.item = null;
                vm.searchString = '';
                $state.go('root.user.guide', $stateParams);
            }
        };
        // show modal for successful/failed sessions + enter item number for unrecognized devices
        vm.showGuideForCards = function(session) {
            if (session.device.item_number) {
                if (session._id && session.status === 'Incomplete') {
                    var $stateParams = {};
                    $stateParams.itemNumber = session.device.item_number;
                    $stateParams.sessionId = session._id;
                    vm.item = null;
                    vm.searchString = '';
                    $state.go('root.user.guide', $stateParams);
                } else if (session.status === 'Fail') {
                    if (session.failedTests && session.failedTests.length > 0) {
                        vm.failedTests = session.failedTests;
                        if (vm.failedTests.length <= 4) {
                            openHelpModal('xxs', vm.failedTests);
                        } else {
                            openHelpModal('sm-to-xs', vm.failedTests);
                        }
                    } else {
                        if (session.logs.length > 0) {
                            var isBroken = false;
                            var sessionExpired = false;
                            for (var i = 0; i <
                            session.logs.length; i++) {
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
                    openHelpModal('xxs', 'Device refreshed successfully.');
                }
            } else {
                openHelpModal('sm-to-xs', 'Unrecognized Device', session._id, session);
            }
        };
        vm.openFeedbackModal = function() {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
        vm.openSurveyModal = function() {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Survey-modal.html',
                controller: 'SessionSurveyController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };

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

        // jscs: enable
        vm.unlockForService = function() {
            if (vm.item) {
                inventory.unlock(vm.item.serial_number, true).
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
                station.isServiceCenter().
                    then(function(isServiceCenter) {
                        vm.isServiceCenter = isServiceCenter;
                    })];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        socket.on('device-add', function() {
            toastr.info('New USB drive was inserted into station', {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            vm.viewBootDevices();
        });
        socket.on('device-remove', function() {
            toastr.info('USB drive was removed from station', {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            vm.viewBootDevices();
        });
        socket.on('app-start', function(session) {
            updateSession(session);
            toastr.info('Refresh started for device:' +
                session.device.serial_number, {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
        });
        socket.on('session-started', function(session) {
            updateSession(session);
            vm.viewSessions();
        });
        socket.on('session-updated', function(session) {
            updateSession(session);
        });
        socket.on('session-complete', function(session) {
            updateSession(session);
            if (session !== null) {
                toastr.info('Refresh finished', {
                    'tapToDismiss': true,
                    'timeOut': 3000,
                    'closeButton': true
                });
            }
            vm.viewSessions();
        });
        socket.on('session-error', function() {
            toastr.error('Something went wrong while reading sessions', {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
        });
        socket.on('android-session-expired', function(data) {
            if ($state.current.name === 'root.user') {
                toastr.warning('Session expired for device:' + data.device,
                    {
                        'tapToDismiss': true,
                        'timeOut': 3000,
                        'closeButton': true
                    });
            }
        });

        function displayBanner() {
            //604800000 - 7 days
            vm.lastSurveyTime = new Date(
                localStorage.getItem('surveyPassedDate'));
            vm.currentDate = new Date();
            if ((vm.currentDate - vm.lastSurveyTime) > 604800000) {
                vm.showBanner = true;
            }
        }
    }
})();
