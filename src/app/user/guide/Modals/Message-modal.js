(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('MessageModalController', MessageModalController);

    MessageModalController.$inject = ['popupLauncher', 'data'];

    function MessageModalController(popupLauncher, data) {
        /*jshint validthis: true */
        var vm = this;
        if (data.errors) {
            vm.errors = data.errors;
        } else {
            vm.message = data.message;
        }
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

