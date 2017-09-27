(function() {
    'use strict';

    angular
        .module('app.user')
        .component('usbGuide',
            {
                bindings: {
                    item: '<'
                },
                controller: usbGuideController,
                controllerAs: 'vm',
                templateUrl: 'app/user/guide/UsbGuides/Usb_guide/UsbGuide.template.html'
            }
        );

    usbGuideController.$inject = ['$scope'];

    function usbGuideController($scope) {
        var vm = this;
        vm.test = 'test';
        var modal = document.getElementById('myModal');
        var modalImg = document.getElementById('img01');
        vm.hp = false;
        vm.dell = false;
        vm.mac = false;
        vm.xBox = false;
        if (!vm.item.CalledFromHome) {
            vm.height = {'height':'70vh'};
        }
        if (angular.lowercase(vm.item.Manufacturer) === 'hp' && angular.lowercase(vm.item.Type) === 'windowsusb') {
            vm.hp = true;
        }
        if (angular.lowercase(vm.item.Manufacturer) === 'dell' && angular.lowercase(vm.item.Type) === 'windowsusb') {
            vm.dell = true;
        }
        if (angular.lowercase(vm.item.Type) === 'mac') {
            vm.mac = true;
        }
        if (angular.lowercase(vm.item.Type) === 'xboxone') {
            vm.xbox = true;
        }
        vm.openModal = function(src) {
            modal.style.display = 'block';
            modalImg.src = src;

        };
        modal.onclick = function() {
            modal.style.display = 'none';
        };
        function sticky(_el){
            _el.parentElement.addEventListener('scroll', function(){
                _el.style.transform = 'translateY(' + this.scrollTop + 'px)';
            });
        }
        var el = document.querySelector('#instructions > #myModal');
        sticky(el);
    }
})();

