(function() {
    'use strict';

    angular
        .module('app')
        .controller('UserHeaderController', UserHeaderController);

    UserHeaderController.$inject = ['$scope', '$q', '$log', 'config', 'guideService', '$state'];

    function UserHeaderController($scope, $q, $log, config, guideService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.currentUser = undefined;
        vm.logoImage = config.logoImage;
        vm.guide = guideService;
        $scope.searchString = guideService.searchString;

        $scope.selectGuide = function(event) {
            guideService.getGuide($scope.searchString).then(function(guide) {
                if (guide !== null) {
                    var $stateParams = {};
                    $stateParams.guide = guide.SKU;
                    $state.go('root.user.guide', $stateParams);
                }
            });
        };

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
