(function() {
    'use strict';

    angular
        .module('app.core')
        .factory('popupLauncher', popupLauncher);

    popupLauncher.$inject = ['$uibModal'];

    function popupLauncher($uibModal, $uibModalInstance) {
        var service = {
            openModal: openModal,
            closeModal:closeModal
        };

        function openModal(config) {

            if (service.modalWindow) {
                service.modalWindow.dismiss();
            }

           service.eventDispatcher = {
                listen: function(callback) {
                    this._callback = callback;
                },
                dispatch: function() {
                    this._callback();
                }
            };
             config.resolve = config.resolve || {};
             config.resolve.eventDispatcher = service.eventDispatcher;
            service.modalWindow = $uibModal.open(config);
        }

        function closeModal(){
            if (service.modalWindow) {
                service.modalWindow.dismiss();
            }
        }

        return service;
    }
})();
