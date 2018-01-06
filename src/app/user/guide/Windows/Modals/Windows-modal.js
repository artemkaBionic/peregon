(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('WindowsModalController', WindowsModalController);

    WindowsModalController.$inject = ['popupLauncher', 'Data'];

    function WindowsModalController(popupLauncher, Data) {
        /*jshint validthis: true */
        var vm = this;
        vm.data = Data;
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

