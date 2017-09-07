(function() {
    'use strict';
    angular.module('app.user')
        .filter('inputFilter', function() {
            return function(input, filterStr) {
                // var arr = Object.keys(input).map(function(key) { return input[key]; });
                // if (!angular.isUndefined(filterStr)) {
                //     var tokens = filterStr.split(' ');
                //     for (var i = 0; i < tokens.length; i++){
                //         tokens[i] = tokens[i].replace(/['"]+/g, '');
                //         if (tokens[i] === 'AllSessions') {
                //             tokens.splice(i,1);
                //         } else if (tokens[i] === 'SessionsInProgress') {
                //             tokens[i] = 'incomplete';
                //         } else if (tokens[i] === 'FailedSessions') {
                //             tokens[i] = 'fail';
                //         } else if (tokens[i] === 'SuccessfulSessions') {
                //             tokens[i] = 'success';
                //         }
                //     }
                // } else {
                //     return input;
                // }
                // //console.log(tokens);
                // var items = arr.filter(function(obj) {
                //     // gets values from items array
                //     var values = Object.values(obj.device).map(function(value) {
                //     //    console.log(obj.device);
                //         if (value !== null) {
                //             return value.toString().toLowerCase();
                //         }
                //     });
                //     // jscs:disable
                //     for (var i = 0; i < values.length; i++) {
                //         if (values[i] === obj.device.item_number) {
                //             values.push(obj.status.toLowerCase());
                //         }
                //     }
                //     // jscs:enable
                //     // checks if values from items includes tokens
                //     var keysExistsInObj = tokens.filter(function(key) {
                //         return values.some(function(v) {
                //             if (!angular.isUndefined(v)) {
                //                 if (key.startsWith('-')) {
                //                     key = '';
                //                 } else {
                //                     return v.includes(key.toLowerCase());
                //                 }
                //
                //             }
                //         });
                //     });
                //     return keysExistsInObj.length === tokens.length;
                // });
                // return items;
                return input;
            };
        });
}());

