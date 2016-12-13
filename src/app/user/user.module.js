(function() {
    'use strict';

    var module = angular.module('app.user', ['ui.router']);
    var config = module.config(appConfig);
    config.run(onStateChange);

    appConfig.$inject = ['$stateProvider', '$apcSidebarProvider', '$filterProvider'];
    function appConfig($stateProvider, $apcSidebarProvider, $filterProvider) {

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
                    item: getItem,
                    guide: getGuide
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

        getGuide.$inject = ['guideService', 'item'];
        function getGuide(guideService, item) {
            return guideService.getGuide(item.Sku).then(function(guide) {
                if (guide) {
                    return guide;
                } else {
                    throw(new Error('SKU ' + item.Sku + ' not found.'));
                }
            });
        }

        guideTemplate.$inject = ['$templateCache', '$http', 'guide'];
        function guideTemplate($templateCache, $http, guide) {
            var templateUrl = 'app/user/guide/guide.html';
            if (guide.DynamicGuideName) {
                templateUrl = 'app/user/guide/' + guide.DynamicGuideName + '/' + guide.DynamicGuideName + '.html';
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

        guideController.$inject = ['guide'];
        function guideController(guide) {
            var controllerName = 'GuideController';
            if (guide.DynamicGuideName) {
                controllerName = 'GuideController' + guide.DynamicGuideName;
            }
            return controllerName;
        }

        $apcSidebarProvider.config('home', {
            title: 'Home',
            nav: 10,
            content: '<span ui-sref="root.user" data-apc-sidebar-group-heading="Home" data-icon-class="fa fa-home"></span>'
        });
        $apcSidebarProvider.config('media', {
            title: 'Media',
            nav: 20,
            content: '<span ui-sref="root.media" data-apc-sidebar-group-heading="Media" data-icon-class="fa fa-download"></span>'
        });

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
