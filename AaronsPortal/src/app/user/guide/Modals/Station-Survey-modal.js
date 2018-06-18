(function() {
    'use strict';

    angular.module('app.user').
        controller('SessionSurveyController', SessionSurveyController);

    SessionSurveyController.$inject = ['popupLauncher', '$scope', '$http'];

    function SessionSurveyController(popupLauncher, $scope, $http) {
        var vm = this;
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
        vm.submitted = false;
        vm.goHome = function() {
            //debugger;
            //$state.go('root.user');
            vm.submitted = true;
            $scope.$apply();
        };
        window.goHome = vm.goHome;
        $http.get('getStationName').then(function(response) {
            vm.stationName = response.data;
        });
    }
})();

