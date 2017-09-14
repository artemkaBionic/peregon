(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UsbGuidesController', UsbGuidesController);

    UsbGuidesController.$inject = [];

    function UsbGuidesController() {
        var vm = this;
        vm.steps = {
            hp: {
                name: 'hp',
                number: 1
            },
            dell: {
                name: 'dell',
                number: 2
            },
            xBox: {
                name: 'xBox',
                number: 3
            },
            apple: {
                name: 'apple',
                number: 4
            }
        };
        var modal = document.getElementById('myModal');
        var modalImg = document.getElementById('img01');
        vm.step = vm.steps.hp;
        vm.showHp = function(){
            vm.step = vm.steps.hp;
        };
        vm.showDell = function(){
            vm.step = vm.steps.dell;
        };
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
