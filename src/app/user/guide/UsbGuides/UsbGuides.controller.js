(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('UsbGuidesController', UsbGuidesController);

    UsbGuidesController.$inject = ['$stateParams'];

    function UsbGuidesController($stateParams) {
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
        console.log($stateParams);

        var modal = document.getElementById('myModal');
        var modalImg = document.getElementById('img01');
        if ($stateParams.device === 'dell') {
            vm.step = vm.steps.dell;
            modal.style.display = 'none';
            vm.title = 'Dell laptop refresh';
        } else if ($stateParams.device === 'hewlettPackard'){
            vm.step = vm.steps.hp;
            modal.style.display = 'none';
            vm.title = 'HP laptop refresh';
        } else if ($stateParams.device === 'mac'){
            vm.step = vm.steps.apple;
            modal.style.display = 'none';
            vm.title = 'Mac refresh';
        } else {
            vm.step = vm.steps.xBox;
            modal.style.display = 'none';
            vm.title = 'X-Box refresh';
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
