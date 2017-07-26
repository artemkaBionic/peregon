(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('SimultaneousController', SimultaneousController);

    SimultaneousController.$inject = ['socketService', '$http'];

    function SimultaneousController(socketService, $http) {
        var vm = this;
        vm.items = [];
        activate();
        socketService.on('device-added', function(data) {
            console.log('device added:' + JSON.stringify(data));
            vm.item = {};
            vm.item.deviceId = data.device;
            vm.item.status = 'Device added';
            vm.item.date = new Date();
            vm.items.push(vm.item);
            console.log(vm.items);
        });
        socketService.on('app-installed', function(data) {
            for (var i = 0;i < vm.items.length; i++){
                if (vm.items[i].deviceId === data.device){
                    vm.items[i].status = 'Refresh App installed';
                }
            }
        });
        function activate() {
            $http({
                url: '/trackDevices',
                method: 'POST'
            }).then(function(response) {
                console.log(response);
            });
        }
    }
})();
