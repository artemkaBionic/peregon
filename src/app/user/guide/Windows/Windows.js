(function() {
    'use strict';

    angular
        .module('app.user')
        .controller('GuideControllerWindows', GuideControllerWindows);

    GuideControllerWindows.$inject = ['$q', 'config', 'item', 'packageService', '$state'];

    function GuideControllerWindows($q, config, item, packageService, $state) {
        /*jshint validthis: true */
        var vm = this;
        vm.isPackageReady = null;
        vm.item = item;
        vm.guideUrl = config.guidesPath + '/' + item.Sku + '/' + config.guidesIndexFile;
        vm.ready = false;
        vm.noUsbRefresh = false;
        vm.usbRefresh = false;
       // console.log(item);
        if (item.Type === 'Windows') {
            vm.noUsbRefresh = true;
        } else {
            vm.noUsbRefresh = true;
        }
        console.log(vm.noUsbRefresh);
        console.log(vm.usbRefresh);
        vm.steps = {
            winNoUSBprepare: {
                name: 'winNoUSBprepare',
                number: 1,
                title: 'Prepare USB drive'
            },
            winUSBprepare: {
                name: 'winUSBprepare',
                number: 2,
                title: 'Prepare USB drive'
            },
            refresh: {
                name: 'refreshMac',
                number: 3,
                title: 'Refresh MAC'
            },
            finish: {
                name: 'checkStatus',
                number: 4,
                title: 'Check status.'
            }
        };
        vm.substeps = {
            checkCondition: {
                name: 'checkCondition',
                number: 1,
                title: 'Check Condition'
            },
            insertUsbToStation: {
                name: 'insertUsbToStation',
                number: 2,
                title: 'Insert USB To Station'
            },
            usbLoading: {
                name: 'usbLoading',
                number: 3,
                title: 'Insert USB To Station'
            },
            usbFailed: {
                name: 'usbFailed',
                number: 4,
                title: 'USB Failed'
            },
            refreshSuccess: {
                name: 'refreshSuccess',
                number: 5,
                title: 'Refresh Success'
            },
            rerfeshFailed: {
                name: 'rerfeshFailed',
                number: 6,
                title: 'Refresh Failed'
            },
            deviceBroken: {
                name: 'deviceBroken',
                number: 7,
                title: 'Device Broken'
            },
            usbLoadFailed: {
                name: 'usbLoadFailed',
                number: 8,
                title: 'USB Load Failed'
            }
        };
        activate();
        vm.count = 0;
        for (var i = 0; i <= 3; i++) {
            vm.count++;
        }
        vm.refreshEnd = function() {
            $state.go('root.user');
        };
        vm.nextStep = function() {
            console.log('here');
           vm.step.number++;
        };
        vm.previousStep = function() {
            vm.step.number--;
        };
        vm.nextSubstep = function() {
            vm.substep.number++;
        };
        vm.previousSubstep = function() {
            vm.substep.number--;
        };
        function activate() {
           vm.step = vm.steps.winNoUSBprepare;
           vm.substep = vm.substeps.checkCondition;
        }

        function checkIsPackageReady() {
            packageService.isPackageReady(item.Sku).then(function(result) {
                vm.isPackageReady = result;
            });
        }
    }
})();
