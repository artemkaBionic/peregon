(function() {
    'use strict';

    angular.module('app.user').
        controller('MediaPackageController', MediaPackageController);

    MediaPackageController.$inject = [
        '$scope',
        '$stateParams',
        'socketService'];

    function MediaPackageController($scope, $stateParams, socket) {
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

            socket.once('device-apply-progress', function(data) {
                $scope.progress = data.progress;
                if ($scope.progress >= 100) {
                    $scope.finished = true;
                }
            });

            var data = {};
            data.device = $scope.device;
            data.media = $scope.mediaPackage;
            socket.emit('device-apply', data);
        };
    }
})();
