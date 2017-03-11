(function() {
    'use strict';

    var app = angular.module('app', [
        'appchord.p0rtal',
        /*
         * Feature areas
         */
        'app.env',
        'app.core',
        'app.socket',
        'app.station',
        'app.device',
        'app.event',
        'app.inventory',
        'app.user',
        'app.package',
        /*
        * 3-rd Party
         */
        'angularMoment',
        'ui.select',
        'ngSanitize',
        'angular-ladda',
        'ngAnimate',
        'ui.bootstrap',
        'Orbicular',
        'bc.AngularKeypad',
        'angularRipple'
    ]);

    app.config(appConfig);
    app.run(appRun);

    appConfig.$inject = ['$stateProvider', '$urlRouterProvider', 'cfpLoadingBarProvider', '$logProvider', '$animateProvider', 'toastrConfig'];
    function appConfig($stateProvider, $urlRouterProvider, cfpLoadingBarProvider, $logProvider, $animateProvider, toastrConfig) {
        cfpLoadingBarProvider.includeSpinner = false;
        $logProvider.debugEnabled(true);
        //isolate ngAnimate to avoid conflicts with other libraries
        $animateProvider.classNameFilter(/anim-/);

        angular.extend(toastrConfig, {
            newestOnTop: false,
            preventDuplicates: false
        });

        $stateProvider
            .state('root', {
                url: '',
                templateUrl: 'app/app.html',
                controller: 'ApplicationController',
                controllerAs: 'vm',
                resolve: {
                    init: initApp
                }
            })
            .state('403', {
                url: '/403',
                templateUrl: 'app/403.html'
            })
        ;

        initApp.$inject = ['securityService', '$log'];
        function initApp(securityService, $log) {
            $log.debug('init session: start');
            return securityService.initSession()
                .then(function() {
                    $log.debug('init session: end');
                });
        }

        $urlRouterProvider.otherwise(function($injector) {
            var $state = $injector.get('$state');
            $state.go('root');
        });
    }

    appRun.$inject = ['$state', '$rootScope', 'securityService', '$log'];
    function appRun($state, $rootScope, securityService, $log) {
        $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
            $log.debug('navigate: ' + toState.name);

            //stop transition
            event.preventDefault();

            securityService.getSession()
                .then(checkRights);

            function checkRights(){
                // if route requires auth and user is not logged in
                if (!securityService.isAuthenticated()) {
                    $log.debug('access denied');
                    $state.go('403');
                }
                else {
                    if (toState.name === 'root') {
                        //redirect to home
                        $state.go(getHome());
                    }
                    else {
                        //if route is restricted by roles check rights and
                        // if user doesn't have access to the target route - redirect to home
                        var roles = (toState.data && toState.data.roles) ? toState.data.roles : [];
                        if (roles && !securityService.hasRoles(roles)) {
                            $state.go(getHome());
                        }
                        else {
                            //resume transition
                            $state.go(toState.name, toParams, {notify: false})
                                .then(function() {
                                    $rootScope.$broadcast('$stateChangeSuccess', toState, toParams, fromState, fromParams);
                                });
                        }
                    }
                }
            }
        });

        function getHome() {
            if (securityService.hasRole('admin')) {
                return 'root.admin';
            }
            else {
                return 'root.user';
            }
        }
    }
})();
