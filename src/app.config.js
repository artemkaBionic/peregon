(function() {
    'use strict';

    var app = angular.module('app');

    var config = {
        name: 'Aarons',
        appTitle: 'Aarons Portal',
        version: '1.0.1',
        guidesPath: '/assets/guides',
        guidesIndexFile: 'index.html',
        partialSkuRegEx: /^73(\d{0,2}|\d{2}\w{0,5})$/, // "73" followed by two digits followed by three digits or letters
        itemNumberRegEx: /^\d{7,10}$|^SALO$/, // Numeric only 10 digits or the word SALO
        partialItemNumberRegEx: /^\d{0,10}$|^SALO$|^SAL$|^SA$|^S$/, // Numeric only up to 10 digits or the word SALO
        deviceUnlockTimeout: 3600000,
        networkDevices: [
            {
                description: 'Meraki MX64 Cloud Managed Router',
                displayDescription: 'Cisco Firewall',
                deviceImageFile: 'FirewallMerakiMx64.png',
                wiringImageFile: 'WiringDiagramMerakiMx64.png',
                correctPort: '4',
                isServiceCenterConfig: false,
                isPortDetectable: false
            },
            {
                description: 'Meraki MS220-24P Cloud Managed PoE Switch',
                displayDescription: 'Cisco Switch',
                deviceImageFile: 'SwitchMerakiMs220-24.png',
                wiringImageFile: 'WiringDiagramMerakiMs220ServiceCenter.png',
                correctPort: '21',
                isServiceCenterConfig: true,
                isPortDetectable: true
            },
            {
                description: 'Meraki MS220-24P Cloud Managed PoE Switch',
                displayDescription: 'Cisco Switch',
                deviceImageFile: 'SwitchMerakiMs220-24.png',
                wiringImageFile: 'WiringDiagramMerakiMs220.png',
                correctPort: '22',
                isServiceCenterConfig: false,
                isPortDetectable: true
            }
        ],
        demo: false
    };

    app.value('config', config);
})();
