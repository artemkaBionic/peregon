(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('SessionFeedbackController', SessionFeedbackController);

    SessionFeedbackController.$inject = ['popupLauncher', '$scope'];

    function SessionFeedbackController(popupLauncher, $scope) {
        var vm = this;
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
        var vm = this;
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

