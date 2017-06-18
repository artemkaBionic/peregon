(function() {
    'use strict';

    var module = angular.module('app.user', ['ui.router', 'ui.bootstrap']);
    var config = module.config(appConfig);
    config.run(onStateChange);

    appConfig.$inject = ['$stateProvider', '$filterProvider'];
    function appConfig($stateProvider, $filterProvider) {

        $stateProvider
            .state('root.user', {
                url: '/user/home',
                templateUrl: 'app/user/user.html',
                controller: 'UserController',
                controllerAs: 'vm'
            })
            .state('root.user.guide', {
                url: '/guide/:itemNumber',
                resolve: {
                    item: getItem
                },
                templateProvider: guideTemplate,
                controllerProvider: guideController,
                controllerAs: 'vm'
            })
            .state('root.media', {
                url: '/media/',
                params: {
                    deviceId: null
                },
                templateUrl: 'app/user/media/media.html',
                controller: 'MediaController',
                controllerAs: 'vm'
            })
            .state('root.media.package', {
                url: '/media/package/',
                params: {
                    device: null,
                    package: null
                },
                templateUrl: 'app/user/media/package/package.html',
                controller: 'MediaPackageController',
                controllerAs: 'vm'
            });

        getItem.$inject = ['$stateParams', 'inventoryService'];
        function getItem($stateParams, inventoryService) {
            return inventoryService.getItem($stateParams.itemNumber).then(function(item) {
                if (item) {
                    return item;
                } else {
                    throw(new Error('Item ' + $stateParams.itemNumber + ' not found.'));
                }
            });
        }

        guideTemplate.$inject = ['$templateCache', '$http', 'item'];
        function guideTemplate($templateCache, $http, item) {
            var templateUrl = 'app/user/guide/unsupported.html';
            if (item.Type !== null) {
                templateUrl = 'app/user/guide/' + item.Type + '/' + item.Type + '.html';
            }
            var templateContent = $templateCache.get(templateUrl);
            if (!templateContent) {
                return $http.get(templateUrl).then(function(tpl) {
                    $templateCache.put(templateUrl, tpl.data);
                    return tpl.data;
                });
            } else {
                return templateContent;
            }
        }

        guideController.$inject = ['item'];
        function guideController(item) {
            var controllerName = 'GuideControllerUnsupported';
            if (item.Type !== null) {
                controllerName = 'GuideController' + item.Type;
            }
            return controllerName;
        }

        getPost.$inject = ['$stateParams', 'dataService'];
        function getPost($stateParams, dataService) {
            var id = $stateParams.post;
            return dataService.getPost(id);
        }

        $filterProvider.register('bytes', function() {
            return function(bytes, precision) {
                if (bytes === 0) {
                    return '0 MB';
                } else if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
                    return 'unknown';
                }
                if (typeof precision === 'undefined') {
                    precision = 1;
                }
                var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
                var number = Math.floor(Math.log(bytes) / Math.log(1024));
                return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
            };
        });

        $filterProvider.register('milliseconds', function() {
            return function(milliseconds) {
                var oneSecond = 1000;
                var intervalSeconds = oneSecond * 15;
                var oneMinute = oneSecond * 60;
                var oneHour = oneMinute * 60;
                var oneDay = oneHour * 24;

                // Round up to multiple of intervalSeconds
                milliseconds = Math.ceil(milliseconds / intervalSeconds) * intervalSeconds;

                var seconds = Math.floor((milliseconds % oneMinute) / oneSecond);
                var minutes = Math.floor((milliseconds % oneHour) / oneMinute);
                var hours = Math.floor((milliseconds % oneDay) / oneHour);
                var days = Math.floor(milliseconds / oneDay);

                var timeString = '';
                if (days !== 0) {
                    timeString += (days !== 1) ? (days + ' days ') : (days + ' day ');
                }
                if (hours !== 0) {
                    timeString += (hours !== 1) ? (hours + ' hours ') : (hours + ' hour ');
                }
                if (minutes !== 0) {
                    timeString += (minutes !== 1) ? (minutes + ' minutes ') : (minutes + ' minute ');
                }
                if (days === 0 && hours === 0 && minutes < 5) {
                    timeString += (seconds !== 1) ? (seconds + ' seconds ') : (seconds + ' second ');
                }

                return timeString;
            }
        });
    }

    onStateChange.$inject = ['$rootScope', 'eventService'];
    function onStateChange($rootScope, eventService) {
        $rootScope.$on('$stateChangeStart', function(e, toState) {
            if (toState.name === 'root.user') {
                eventService.EnableDeviceNotification();
            }
        });

    }
})();
