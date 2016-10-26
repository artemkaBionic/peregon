(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UserController', UserController);

    UserController.$inject = ['$rootScope', '$scope', '$q', 'config', '$http', 'guideService'];

    function UserController($rootScope, $scope, $q, config, $http, guideService) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        $scope.guides = [];
        $scope.guideService = guideService;
        $scope.searchString = guideService.searchString;
        $scope.guideFilter = function(guide) {
            if (!$scope.searchString) {
                return true;
            } else {
                var match = $scope.searchString.match(guide.SkuRegEx);
                return (match !== null && match[0] === $scope.searchString);
            }
        };

        activate();

        function activate() {
            var queries = [loadData()];
            return $q.all(queries).then(function() {
                vm.ready = true;
            });
        }

        function loadData() {
            guideService.getGuides().then(function(guides) {
                $scope.guides = guides;
            });
        }
    }
})();
