(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('SimultaneousController', SimultaneousController);

    SimultaneousController.$inject = ['socketService', '$http', 'inventoryService'];

    function SimultaneousController(socketService, $http, inventoryService) {
        var vm = this;
        vm.items = [];
        socketService.on('android-add', function() {
          //  console.log('device added:' + JSON.stringify(data));
           // inventoryService.updateSession(vm.item.InventoryNumber, 'Info', 'Android device connected.');
            vm.item = {};
            //vm.item.deviceId = data.device;
            vm.item.status = 'Device added';
            vm.item.date = new Date();
            vm.items.push(vm.item);
            console.log(vm.items);
        });
        socketService.on('app-installed', function() {
            for (var i = 0;i < vm.items.length; i++){
                //if (vm.items[i].deviceId === data.device){
                    vm.items[i].status = 'Refresh App installed';
              //  }
            }
        });

    }
})();
