(function() {
    'use strict';

    angular
        .module('app')
        .directive('roleSecurity', roleSecurity);

    roleSecurity.$inject = ['securityService'];

    function roleSecurity(securityService) {
        // Description:
        //      Allows to display or hide an element based on the user's security roles
        // Usage:
        //      <div data-role-security="['Admin']" >I'm part of the Admin's role</div>
        //      <div data-role-security="['Admin', 'User']">I'm part of the either the Admin's or User's role</div>
        // Creates:
        //      Will display
        //      <div>I'm part of the Admin's role</div>
        //      If the user is logged in and one of his/her roles is Admin
        //      <div>I'm part of the either the Admin's or User's role</div>
        //      If the user is logged in and one of his/her roles is Admin OR User
        var directive = {
            link: link,
            restrict: 'A'
        };
        return directive;

        function link(scope, element, attrs) {
            scope.$watch(attrs.roleSecurity, function(roles) {
                var hide = true;
                if (roles === undefined || roles === null) {
                    hide = false;
                } else {
                    hide = !securityService.hasRoles(roles);
                }

                if (hide) {
                    element.hide();
                }
            });
        }
    }
})();
