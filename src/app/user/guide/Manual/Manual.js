(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerManual', GuideControllerManual);

    GuideControllerManual.$inject = ['item', '$state', 'popupLauncher'];

    function GuideControllerManual(item, $state, popupLauncher) {
        /*jshint validthis: true */
        var vm = this;
        var modal;
        var modalImg;
        vm.item = item;
        vm.showInstruction = true;
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        vm.steps = {
            prepare: {
                name: 'prepare',
                number: 1,
                title: 'Prepare Refresh'
            },
            refresh: {
                name: 'refresh',
                number: 2,
                title: 'Refresh Device'
            }
        };
        vm.substeps = {
            checkCondition: {
                name: 'checkCondition',
                number: 0,
                title: 'Check Condition'
            },
            refreshSuccess: {
                name: 'refreshSuccess',
                number: 1,
                title: 'Refresh Success'
            },
            refreshFailed: {
                name: 'rerfeshFailed',
                number: 2,
                title: 'Refresh Failed'
            },
            deviceBroken: {
                name: 'deviceBroken',
                number: 3,
                title: 'Device Broken'
            },
            instruction: {
                name: 'instruction',
                number: 4,
                title: 'Instruction'
            }
        };
        vm.step = vm.steps.prepare;
        vm.substep = vm.substeps.checkCondition;
        vm.deviceGood = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.instruction;
        };
        vm.openFeedbackModal = function(){
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Modals/Station-Feedback-modal.html',
                controller: 'SessionFeedbackController',
                bindToController: true,
                controllerAs: 'vm',
                size: 'sm-to-lg'
            });
        };
        vm.deviceBad = function() {
            vm.substep = vm.substeps.deviceBroken;
        };
        vm.refreshSuccess = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.refreshSuccess;
        };
        vm.refreshFailed = function() {
            vm.step = vm.steps.refresh;
            vm.substep = vm.substeps.refreshFailed;
        };
        vm.retry = function() {
            vm.step = vm.steps.prepare;
            vm.substep = vm.substeps.checkCondition;
        };
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        function sticky(_el){
            _el.parentElement.addEventListener('scroll', function(){
                _el.style.transform = 'translateY(' + this.scrollTop + 'px)';
            });
        }
        vm.openModal = function(src) {
            modal = angular.element('#myModal');
            modalImg = document.getElementById('img01');
            modal.css('display', 'block');
            modalImg.src = src;
            var el = document.querySelector('#instructions > #myModal');
            sticky(el);
        };
        vm.close = function() {
            modal = angular.element('#myModal');
            modal.css('display', 'none');
        };
        var container = angular.element(document.querySelector('#instructions'));
        var footer = angular.element(document.querySelector('.content-finish'));
        var lastStep = angular.element(document.querySelector('#instructions > #lastStep'));
        container.on('scroll', function(){
            if (parseInt(container[0].offsetHeight + container[0].scrollTop + 1)  >= container[0].scrollHeight) {
                console.log('here1');
                footer.css('display', 'none');
                lastStep.attr('style','background-color:#e8eaed');
            } else {
                footer.css('display', 'block');
                lastStep.attr('style','background-color:white')
            }

        });

        vm.openHelpModal = function(modalSize, text, image) {
            vm.test = {
                text: text,
                image: image
            };
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Manual/Modals/Manual-modal.html',
                controller: 'ManualModalController',
                bindToController: true,
                controllerAs: 'vm',
                resolve: {Data: vm.test},
                size: modalSize
            });
        };
    }
})();

