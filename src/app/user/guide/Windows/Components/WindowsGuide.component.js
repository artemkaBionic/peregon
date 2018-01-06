(function() {
    'use strict';

    angular
    .module('app.user')
    .component('windowsGuide',
        {
            bindings: {
                item: '<'
            },
            controller: windowsGuideController,
            controllerAs: 'vm',
            templateUrl: 'app/user/guide/Windows/Components/WindowsGuide.template.html'
        }
    );

    windowsGuideController.$inject = ['$timeout', '$rootScope', 'popupLauncher'];

    function windowsGuideController($timeout, $rootScope, popupLauncher) {
        var vm = this;
        var modal;
        var modalImg;
        vm.templateUrl = getTemplate();
        function getTemplate(){
            var template = null;
            var manufacturer = vm.item.manufacturer.toUpperCase();
            if (manufacturer === 'ASUS') {
                template = 'AsusUefi';
            } else if (manufacturer === 'DELL' || manufacturer === 'DELL USA') {
                template = 'DellUefi';
            } else if (manufacturer === 'HEWLETT-PACKARD' || manufacturer === 'HP') {
                template = 'HpUefi';
            } else if (manufacturer === 'TOSHIBA') {
                template = 'ToshibaUefi';
            }
            if (template === null) {
                return null;
            } else {
                return 'app/user/guide/Windows/Components/WindowsGuideTemplates/' + template + '.html';
            }
        }

        function sticky(_el){
            _el.parentElement.addEventListener('scroll', function(){
                _el.style.transform = 'translateY(' + this.scrollTop + 'px)';
            });
        }

        vm.asusUefi = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/AsusUefi.html';
        };
        vm.dellUefi = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/DellUefi.html';
        };
        vm.hpUefi = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/HpUefi.html';
        };
        vm.toshibaUefi = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/ToshibaUefi.html';
        };
        vm.dellBios = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/DellBios.html';
        };
        vm.hpBios = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/HpBios.html';
        };
        vm.toshibaBios = function() {
            vm.templateUrl ='app/user/guide/Windows/Components/WindowsGuideTemplates/ToshibaBios.html';
        };

        $rootScope.$on('$locationChangeStart',function(event, next, current){
            if (vm.templateUrl) {
                vm.templateUrl = null;
                //prevent the location change.
                event.preventDefault();
            }
        });

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
                    lastStep.attr('style','background-color:white');
                }

            });
        }, 1000);
        vm.openHelpModal = function(modalSize, text, image) {
            vm.test = {
                text: text,
                image: image
            };
            popupLauncher.openModal({
                templateUrl: 'app/user/guide/Windows/Modals/Windows-modal.html',
                controller: 'WindowsModalController',
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
