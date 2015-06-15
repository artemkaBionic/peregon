(function() {
    'use strict';

    angular
        .module('app')
        .controller('UserHeaderController', UserHeaderController);

    UserHeaderController.$inject = ['$scope', '$q', '$log', 'config', 'guideService'];

    function UserHeaderController($scope, $q, $log, config, guideService) {
        /*jshint validthis: true */
        var vm = this;
        vm.currentUser = undefined;
        vm.logoImage = config.logoImage;
        vm.guide = guideService;
        $scope.searchString = guideService.searchString;

        activate();

        function activate() {
            var queries = [getUser()];
            return $q.all(queries).then(function() {
                $log.info('Activated User View');
            });
        }

        function getUser(){
            var user = {name: 'admin'};
            return $q.when(user)
                .then(assignData);

            function assignData(data){
                vm.currentUser = data;
            }
        }
    }
})();
