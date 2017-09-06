(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$timeout', '$window','$q', '$state', 'config', 'stationService', 'inventoryService', 'socketService', '$scope', 'toastr', '$http', 'popupLauncher'];

    function UserController($timeout, $window, $q, $state, config, stationService, inventoryService, socketService, $scope, toastr, $http, popupLauncher) {
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
        $scope.$on('$viewContentLoaded', function() {
            $timeout(function(){
                getSessions();
            }, 2000);
        });
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
            toast(data.data.imei);
            getSessions();
        });

        socketService.on('android-session-expired', function(data) {
            if ($state.current.name === 'root.user') {
                toastr.warning('Session expired for device:' + data.device, {
                    'tapToDismiss': true,
                    'timeOut': 3000,
                    'closeButton': true
                });
                getSessions();
            }
        });
        socketService.on('session-expired-confirmation', function() {
            if ($state.current.name === 'root.user') {
                getSessions();
            }
        });
        socketService.on('android-reset', function(status) {
            toastr.info('Refresh finished for device:' + status.imei, {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
            getSessions();
        });
        socketService.on('android-remove', function() {
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
        // jscs:disable
        vm.showGuideForCards = function(session) {
            var item = {'InventoryNumber': session.device.item_number};
            inventoryService.checkSession(item)
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
                                vm.failedTests = ['Session failed because Android device was unplugged.'];
                                openHelpModal('xxs',vm.failedTests);
                            }
                        } else {
                            openHelpModal('xxs','Device refreshed successfully.');
                        }
                    }
                });
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
            $http.get('/data/getAllSessions/')
                .then(function(response) {
                    vm.sessions =  response.data;
                });
        }
        function toast(deviceid){
            toastr.info('Refresh started for device:' + deviceid, {
                'tapToDismiss': true,
                'timeOut': 3000,
                'closeButton': true
            });
        }
        function openHelpModal(modalSize, data) {
            if (typeof(data) === 'string') {
                vm.data = {
                    message: data
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
