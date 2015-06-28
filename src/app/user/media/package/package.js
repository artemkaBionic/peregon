(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('MediaPackageController', MediaPackageController);

    MediaPackageController.$inject = ['$scope', '$stateParams', 'socketService'];

    function MediaPackageController($scope, $stateParams, socketService) {
        /*jshint validthis: true */
        var vm = this;
        vm.ready = false;
        $scope.started = false;
        $scope.finished = false;
        $scope.progress = null;
        $scope.device = $stateParams.device;
        $scope.mediaPackage = $stateParams.package;

        $scope.apply = function() {
            $scope.started = true;
            $scope.progress = 0;
            var data = {};
            data.device = $scope.device;
            data.media = $scope.mediaPackage;
            socketService.emit('device_apply', data);
        };

        socketService.on('device_apply_progress', function(progress) {
            $scope.progress = progress;
            if ($scope.progress >= 100) {
                $scope.finished = true;
            }
        });
    }
})();
