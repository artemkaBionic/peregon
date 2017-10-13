(function() {
    'use strict';

    angular.module('app.user').
        controller('SessionSurveyController', SessionSurveyController);

    SessionSurveyController.$inject = ['popupLauncher', '$scope'];

    function SessionSurveyController(popupLauncher, $scope) {
        var vm = this;
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
        vm.submitted = false;
        vm.goHome = function() {
            //debugger;
            //$state.go('root.user');
            vm.submitted = true;
            console.log('called');
            $scope.$apply();
        };
        window.goHome = vm.goHome;
    }
})();

