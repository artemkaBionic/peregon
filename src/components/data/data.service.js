(function() {
    'use strict';

    angular
        .module('app.data')
        .factory('dataService', dataService);

    dataService.$inject = ['$http', '$log'];

    function dataService($http, $log) {

        var service = {
            getPosts: getPosts,
            getPost: getPost
        };

        return service;

        function getPosts() {
            var url = 'http://jsonplaceholder.typicode.com/posts';

            return $http.get(url)
                .then(processData)
                .catch(function(res) {
                    if (res.status === 404) {
                        //no records found
                        return [];
                    }
                    else {
                        $log.error('Unable to get data. Error occurred: ' + res.data.error.message + '. Url: ' + url);
                    }
                });

            function processData(data) {
                if (data.data) {
                    return data.data;
                }
                else {
                    return [];
                }
            }
        }

        function getPost(id) {
            var url = 'http://jsonplaceholder.typicode.com/posts/' + id;

            return $http.get(url)
                .then(processData)
                .catch(function(res) {
                    if (res.status === 404) {
                        //no records found
                        return null;
                    }
                    else {
                        $log.error('Unable to get data. Error occurred: ' + res.data.error.message + '. Url: ' + url);
                    }
                });

            function processData(data) {
                if (data.data) {
                    return data.data;
                }
                else {
                    return null;
                }
            }
        }
    }
})();
