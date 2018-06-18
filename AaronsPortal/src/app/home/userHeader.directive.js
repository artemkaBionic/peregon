(function() {
    'use strict';

    angular
        .module('app')
        .directive('userHeader', userHeader);

    userHeader.$inject = [];
    function userHeader() {
        var directive = {
            controller: 'UserHeaderController',
            controllerAs: 'user',
            link: link,
            restrict: 'A',
            templateUrl: 'app/home/userHeader.template.html'
        };
        return directive;

        function link() { //scope, element, attributes
        }
    }
})();
