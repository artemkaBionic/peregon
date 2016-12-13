(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('AndroidModalController', AndroidModalController);

    AndroidModalController.$inject = ['popupLauncher', 'ModalStep'];

    function AndroidModalController(popupLauncher, ModalStep) {

        /*jshint validthis: true */
        var vm = this;
        vm.ModalStep = ModalStep; //Getting ModalStep from GuideControllerAndroid
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

