(function() {
    'use strict';

    var app = angular.module('app');

    var config = {
        name: 'Aarons',
        appTitle: 'Aarons Portal',
        version: '0.0.1',
        logoImage: '/assets/images/AaronsLogo.png',
        packageIndex: '/assets/package-index.json',
        guidesPath: '/assets/guides',
        guidesIndexFile: 'index.html',

        demo: false
    };

    app.value('config', config);
})();
