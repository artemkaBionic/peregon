(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('ItemNumberController', ItemNumberController);

    ItemNumberController.$inject = ['$scope', '$q', 'config', 'stationService', 'UserController', 'connectionState', '$uibModalInstance','eventDispatcher','$uibModal'];

    function ItemNumberController($scope, $q, config, stationService, UserController, $uibModalInstance, eventDispatcher, $uibModal) {
        /*jshint validthis: true */
        var vm = this;
        vm.close = close;
        function close() {
            $uibModalInstance.dismiss('close');
        }

    }
})();
