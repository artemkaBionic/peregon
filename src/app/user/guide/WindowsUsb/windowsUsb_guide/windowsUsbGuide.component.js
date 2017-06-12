(function() {
    'use strict';

    angular
        .module('app.user')
        .component('windowsUsbGuide',
            {
                bindings: {
                    item: '<'
                },
                controller: windowsUsbGuideController,
                controllerAs: 'vm',
                templateUrl: 'app/user/guide/WindowsUsb/windowsUsb_guide/windowsUsbGuide.template.html'
            }
        );

    windowsUsbGuideController.$inject = [];

    function windowsUsbGuideController() {
        var vm = this;
        vm.test = 'test';
        var modal = document.getElementById('myModal');
        var modalImg = document.getElementById('img01');
        vm.hp = false;
        vm.dell = false;
        if (angular.lowercase(vm.item.Manufacturer) === 'hp') {
            vm.hp = true;
        }
        if (angular.lowercase(vm.item.Manufacturer) === 'dell') {
            vm.dell = true;
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
        var el = document.querySelector('#relative > #myModal');
        sticky(el);
    }
})();

