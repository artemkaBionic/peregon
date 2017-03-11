(function() {
    'use strict';

    var app = angular.module('app');

    var config = {
        name: 'Aarons',
        appTitle: 'Aarons Portal',
        version: '1.0.1',
        packageIndex: '/assets/package-index.json',
        guidesPath: '/assets/guides',
        guidesIndexFile: 'index.html',
        itemNumberRegEx: /^\d{10}$/,
        networkDevices: [
            {description: 'Meraki MX64 Cloud Managed Router', displayDescription: 'Cisco Firewall', deviceImageFile: 'FirewallMerakiMx64.png', wiringImageFile: 'WiringDiagramMerakiMx64.png', correctPort: '4', isServiceCenterConfig: false, isPortDetectable: false},
            {description: 'Meraki MS220-24P Cloud Managed PoE Switch', displayDescription: 'Cisco Switch', deviceImageFile: 'SwitchMerakiMs220-24.png', wiringImageFile: 'WiringDiagramMerakiMs220ServiceCenter.png', correctPort: '21', isServiceCenterConfig: true, isPortDetectable: true},
            {description: 'Meraki MS220-24P Cloud Managed PoE Switch', displayDescription: 'Cisco Switch', deviceImageFile: 'SwitchMerakiMs220-24.png', wiringImageFile: 'WiringDiagramMerakiMs220.png', correctPort: '22', isServiceCenterConfig: false, isPortDetectable: true}
        ],
        demo: false
    };

    app.value('config', config);
})();
