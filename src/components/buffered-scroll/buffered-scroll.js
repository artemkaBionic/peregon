(function() {
    'use strict';
    angular.module('app.user')
        .directive('bufferedScroll',['$parse', function($parse) {
             return function($scope, element, attrs) {
                 var handler = $parse(attrs.bufferedScroll);
                 element.scroll(function(evt) {
                     var scrollTop    = element[0].scrollTop,
                         scrollHeight = element[0].scrollHeight,
                         offsetHeight = element[0].offsetHeight;
                     if ((scrollTop + 1) >= (scrollHeight - offsetHeight)) {
                         $scope.$apply(function() {
                             handler($scope);
                         });
                     }
                 });
             };
         }]);
}());
