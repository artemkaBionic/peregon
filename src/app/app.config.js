(function() {
    'use strict';

    var app = angular.module('app');

    var config = {
        name: 'Aarons',
        appTitle: 'Aarons Portal',
        version: '0.0.1',
        logoImage: '/assets/images/MobiChord.png',

        demo: false
    };

    app.value('config', config);
})();
