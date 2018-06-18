(function() {
    'use strict';
    angular.module('app.user')
        .filter('inputFilter', function() {
            return function(input, filterStr) {
                var arr = Object.keys(input).map(function(key) {
                    return input[key];
                });
                if (angular.isDefined(filterStr)) {
                    var tokens = filterStr.split(' ');
                    for (var i = tokens.length - 1; i >= 0; i--) { //Processing the array backwards doesn't break when we remove elements form the array.
                        tokens[i] = tokens[i].replace(/['"]+/g, '');
                        if (tokens[i] === 'AllSessions') {
                            tokens.splice(i, 1);
                        } else if (tokens[i] === 'SessionsInProgress') {
                            tokens[i] = 'incomplete';
                        } else if (tokens[i] === 'FailedSessions') {
                            tokens[i] = 'fail';
                        } else if (tokens[i] === 'SuccessfulSessions') {
                            tokens[i] = 'success';
                        }
                    }
                } else {
                    return input;
                }
                return arr.filter(function(obj) {
                    // gets values from items array
                    var values = [];
                    if (angular.isDefined(obj.device)) {
                        values = Object.keys(obj.device).map(function(key) {
                            if (obj.device[key] === undefined || obj.device[key] === null) {
                                return '';
                            } else {
                                return obj.device[key].toString().toLowerCase();
                            }
                        });
                    }
                    for (var i = 0, len = values.length; i < len; i++) {
                        if (values[i] === obj.device.item_number) {
                            values.push(obj.status.toLowerCase());
                        }
                    }
                    // checks if values from items includes tokens
                    var keysExistsInObj = tokens.filter(function(key) {
                        return values.some(function(v) {
                            if (angular.isDefined(v)) {
                                if (key.startsWith('-')) {
                                    key = '';
                                } else {
                                    return v.includes(key.toLowerCase());
                                }
                            }
                        });
                    });
                    return keysExistsInObj.length === tokens.length;
                });
            };
        });
}());

