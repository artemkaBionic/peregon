(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ManualModalController', ManualModalController);

    ManualModalController.$inject = ['popupLauncher', 'Data'];

    function ManualModalController(popupLauncher, Data) {
        /*jshint validthis: true */
        var vm = this;
        vm.data = Data;
        vm.closeModal = popupLauncher.closeModal;//Close modal window by pressing on Dismiss button
    }
})();

