(function() {
    'use strict';

    angular
        .module('app.user')
        .component('bannerController',
            {
                bindings: {
                },
                controller: bannerController,
                controllerAs: 'vm',
                templateUrl: 'components/banner/banner.template.html'
            }
        );

    bannerController.$inject = ['$rootScope'];

    function bannerController($rootScope) {
        var vm = this;
        vm.close = function(){
            vm.hide = true;
            vm.surveyDate = new Date();
            localStorage.setItem('surveyPassedDate',vm.surveyDate);
            $rootScope.$broadcast('showFeedbackButton');
        };
        vm.startSurvey = function(){
            $rootScope.$broadcast('showModal');
            vm.close();
        };
    }
})();
