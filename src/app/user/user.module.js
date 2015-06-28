(function() {
    'use strict';

    var module = angular.module('app.user', ['ui.router']);

    module.config(appConfig);

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
                url: '/guides/:guide',
                templateUrl: 'app/user/guide/guide.html',
                controller: 'GuideController',
                controllerAs: 'vm'
            })
            .state('root.user.media', {
                url: '/media/',
                params: {
                    deviceId: null
                },
                templateUrl: 'app/user/media/media.html',
                controller: 'MediaController',
                controllerAs: 'vm'
            })
            .state('root.user.media.package', {
                url: '/media/package/',
                params: {
                    device: null,
                    package: null
                },
                templateUrl: 'app/user/media/package/package.html',
                controller: 'MediaPackageController',
                controllerAs: 'vm'
            });

        $apcSidebarProvider.config('home', {
            title: 'Home',
            nav: 10,
            content: '<span ui-sref="root.user" data-apc-sidebar-group-heading="Home" data-icon-class="fa fa-home"></span>'
        });
        $apcSidebarProvider.config('media', {
            title: 'Media',
            nav: 20,
            content: '<span ui-sref="root.user.media" data-apc-sidebar-group-heading="Media" data-icon-class="fa fa-download"></span>'
        });

        getPost.$inject = ['$stateParams', 'dataService'];
        function getPost($stateParams, dataService) {
            var id = $stateParams.post;
            return dataService.getPost(id);
        }

        $filterProvider.register('kilobytes', function() {
            return function(kilobytes, precision) {
                var bytes = kilobytes * 1024;
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
})();
