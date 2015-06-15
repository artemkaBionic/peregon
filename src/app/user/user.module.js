(function() {
    'use strict';

    var module = angular.module('app.user', ['ui.router']);

    module.config(appConfig);

    appConfig.$inject = ['$stateProvider', '$apcSidebarProvider'];
    function appConfig($stateProvider, $apcSidebarProvider) {

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
            });

        $apcSidebarProvider.config('home', {
            title: 'Home',
            nav: 10,
            content: '<span ui-sref="root.user" data-apc-sidebar-group-heading="Home" data-icon-class="fa fa-home"></span>'
        });

        getPost.$inject = ['$stateParams', 'dataService'];
        function getPost($stateParams, dataService) {
            var id = $stateParams.post;
            return dataService.getPost(id);
        }
    }
})();
