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

    usbGuideController.$inject = [];

    function usbGuideController() {
        var vm = this;
        vm.test = 'test';
        var modal = document.getElementById('myModal');
        var modalImg = document.getElementById('img01');
        vm.hp = false;
        vm.dell = false;
        vm.mac = false;
        vm.xBox = false;
        vm.android = false;
        if (!vm.item.CalledFromHome && !angular.lowercase(vm.item.Type) === 'android') {
            vm.height = {'height':'72vh'};
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
        if (angular.lowercase(vm.item.Type) === 'android') {
            vm.android = true;
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

