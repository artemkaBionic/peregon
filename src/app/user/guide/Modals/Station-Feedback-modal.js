(function() {
    'use strict';

    angular.module('app.user').
        controller('SessionFeedbackController', SessionFeedbackController);

    SessionFeedbackController.$inject = ['popupLauncher', '$scope', '$http'];

    function SessionFeedbackController(popupLauncher, $scope, $http) {
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
        $http.get('getStationName').then(function(response) {
            vm.stationName = response.data;
        });
        vm.openSurveyModal = function() {
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Survey-modal.html',
                controller: 'SessionSurveyController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
    }
})();
