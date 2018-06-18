(function() {
    'use strict';

    var module = angular.module('app.user', ['ui.router', 'ui.bootstrap']);
    module.config(appConfig);

    appConfig.$inject = ['$stateProvider', '$filterProvider'];

    function appConfig($stateProvider, $filterProvider) {

        $stateProvider.state('root.user', {
            url: '/user/home',
            templateUrl: 'app/user/user.html',
            controller: 'UserController',
            controllerAs: 'vm'
        }).state('root.user.guide', {
            url: '/guide/:itemNumber',
            params: {
                sessionId: null
            },
            resolve: {
                item: getItem
            },
            templateProvider: guideTemplate,
            controllerProvider: guideController,
            controllerAs: 'vm'
        }).state('root.usbGuides', {
            url: '/usbGuides/:type/:manufacturer',
            templateUrl: 'app/user/guide/HomeUsbGuides/HomeUsbGuides.template.html',
            controller: 'HomeUsbGuidesController',
            controllerAs: 'vm'
        }).state('root.user.productFeedback', {
            url: '/productFeedback',
            templateUrl: 'app/user/guide/Feedback/Feedback.template.html',
            controller: 'FeedbackController',
            controllerAs: 'vm'
        });

        getItem.$inject = ['$stateParams', 'inventoryService'];

        function getItem($stateParams, inventory) {
            return inventory.getItem($stateParams.itemNumber).
                then(function(item) {
                    if (item) {
                        return item;
                    } else {
                        throw(new Error('Item ' + $stateParams.itemNumber +
                            ' not found.'));
                    }
                });
        }

        guideTemplate.$inject = ['$templateCache', '$http', 'item'];

        function guideTemplate($templateCache, $http, item) {
            var templateUrl = 'app/user/guide/unsupported.html';
            if (item.product.type !== null) {
                if (item.product.type === 'Mac' || item.product.type === 'XboxOne' || item.product.type === 'WindowsUsb') {
                    templateUrl = 'app/user/guide/UsbGuides/UsbGuides.html';
                } else if (item.product.type === 'Android' || item.product.type === 'Windows') {
                    templateUrl = 'app/user/guide/' + item.product.type + '/' + item.product.type + '.html';
                } else {
                    templateUrl = 'app/user/guide/Manual/Manual.html';
                }
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
            // if (item.product.type !== null) {
            //     controllerName = 'GuideController' + item.product.type;
            // }
            if (item.product.type !== null) {
                if (item.product.type === 'Mac' || item.product.type === 'XboxOne' || item.product.type === 'WindowsUsb') {
                    controllerName = 'GuideControllerUsb';
                } else if (item.product.type === 'Android' || item.product.type === 'Windows') {
                    controllerName = 'GuideController' + item.product.type;
                } else {
                    controllerName = 'GuideControllerManual';
                }
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
                return (bytes / Math.pow(1024, Math.floor(number))).toFixed(
                    precision) + ' ' + units[number];
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
                milliseconds = Math.ceil(milliseconds / intervalSeconds) *
                    intervalSeconds;

                var seconds = Math.floor((milliseconds % oneMinute) /
                    oneSecond);
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
            };
        });
    }
})();
