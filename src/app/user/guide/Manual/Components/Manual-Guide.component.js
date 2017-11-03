(function() {
    'use strict';

    angular
        .module('app.user')
        .component('manualGuide',
            {
                bindings: {
                    item: '<'
                },
                controller: manualGuideController,
                controllerAs: 'vm',
                template: '<div ng-include="vm.getTemplate()">'
            }
        );

    manualGuideController.$inject = ['$timeout', '$rootScope', 'popupLauncher'];

    function manualGuideController($timeout, $rootScope, popupLauncher) {
        var vm = this;
        var modal;
        var modalImg;
        vm.getTemplate = function(){
            return 'app/user/guide/Manual/Components/ManualGuideTemplates/' + vm.item.type + '.html';
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
        $timeout(function() {
            var container = angular.element(document.querySelectorAll('#instructions'));
            var footer = angular.element(document.querySelector('.content-finish'));
            var lastStep = angular.element(document.querySelector('#instructions > #lastStep'));
            console.log(container);
            container.on('scroll', function(){
                if (parseInt(container[0].offsetHeight + container[0].scrollTop + 1)  >= container[0].scrollHeight) {
                    footer.css('display', 'none');
                    lastStep.attr('style','background-color:#e8eaed');
                } else {
                    footer.css('display', 'block');
                    lastStep.attr('style','background-color:white')
                }

            });
        }, 1000);
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
        vm.refreshSuccess = function() {
            $rootScope.$broadcast('refreshSuccess');
        };
        vm.refreshFailed = function() {
            $rootScope.$broadcast('refreshFailed');
        };
    }

})();
