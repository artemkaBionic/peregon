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
        guides: {
            '7339F74': {SKU: '7339F74', GuideName: '7339F74', Model: 'Xbox One Console', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339FB1': {SKU: '7339FB1', GuideName: '7339FB1', Model: 'Xbox One 500GB with Kinect and Bonus Game', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339FB2': {SKU: '7339FB2', GuideName: '7339FB2', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339FB3': {SKU: '7339FB3', GuideName: '7339FB3', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339FB4': {SKU: '7339FB4', GuideName: '7339FB4', Model: 'XBOX ONE S Battlefield 1 500GB', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339NX1': {SKU: '7339NX1', GuideName: '7339NX1', Model: 'Xbox One with 2 Controllers Direct', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XB1': {SKU: '7339XB1', GuideName: '7339XB1', Model: 'Xbox One with Kinect 8 Core 500BG Blu-Ray HDMI 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XB2': {SKU: '7339XB2', GuideName: '7339XB2', Model: 'Xbox One with Kinect 500 GB Blu-Ray HDMI Play Charge', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XB3': {SKU: '7339XB3', GuideName: '7339XB3', Model: 'Xbox One with Kinect 500GB Forza 5 Play Charge Unit', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XB5': {SKU: '7339XB5', GuideName: '7339XB5', Model: 'Xbox One with Kinect 500GB', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XC1': {SKU: '7339XC1', GuideName: '7339XC1', Model: 'Xbox One 500GB Includes Game', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XC2': {SKU: '7339XC2', GuideName: '7339XC2', Model: 'Xbox One 500GB without Kinect', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XC3': {SKU: '7339XC3', GuideName: '7339XC3', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XC4': {SKU: '7339XC4', GuideName: '7339XC4', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XMH': {SKU: '7339XMH', GuideName: '7339XMH', Model: 'Xbox One Bundle', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XS1': {SKU: '7339XS1', GuideName: '7339XS1', Model: 'XBOX ONE S Battlefield Bundle 500GB', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7339XS2': {SKU: '7339XS2', GuideName: '7339XS2', Model: 'XBOX One S Gear of War Bundle', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            '7393937': {SKU: '7393937', GuideName: '7393937', Model: 'GS5GLDRW1', IsRefereshSupported: true, Manufacturer: 'SALO MERCHANDISE', DynamicGuideName: 'Android'},
            '7393938': {SKU: '7393938', GuideName: '7393938', Model: '858921005099', IsRefereshSupported: true, Manufacturer: 'SALO MERCHANDISE', DynamicGuideName: 'Android'},
            '7393964': {SKU: '7393964', GuideName: '7393964', Model: '858921005167', IsRefereshSupported: true, Manufacturer: 'SALO MERCHANDISE', DynamicGuideName: 'Android'},
            '7393CG3': {SKU: '7393CG3', GuideName: '7393CG3', Model: 'LG G3 CANADA', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393CG5': {SKU: '7393CG5', GuideName: '7393CG5', Model: 'MOTOROLA G5 CAN', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393CN3': {SKU: '7393CN3', GuideName: '7393CN3', Model: 'SAMSUNG NOTE 3', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393CS5': {SKU: '7393CS5', GuideName: '7393CS5', Model: 'SAMSUNG S5 CANA', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393GS6': {SKU: '7393GS6', GuideName: '7393GS6', Model: 'SAMSUNGS6', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393GS7': {SKU: '7393GS7', GuideName: '7393GS7', Model: 'SAMSUNG S7', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393LG4': {SKU: '7393LG4', GuideName: '7393LG4', Model: 'US991', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393S6E': {SKU: '7393S6E', GuideName: '7393S6E', Model: 'SAMSUNGS6 EDGE', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393S7E': {SKU: '7393S7E', GuideName: '7393S7E', Model: 'SAMSUNG S7 EDGE', IsRefereshSupported: true, Manufacturer: 'WSA DISTRIBUTING', DynamicGuideName: 'Android'},
            '7393SN4': {SKU: '7393SN4', GuideName: '7393SN4', Model: 'Note 4 5.7"', IsRefereshSupported: true, Manufacturer: 'Samsung', DynamicGuideName: 'Android'},
            '7393TG3': {SKU: '7393TG3', GuideName: '7393TG3', Model: 'LG G3', IsRefereshSupported: true, Manufacturer: 'LG', DynamicGuideName: 'Android'},
            '7393TG5': {SKU: '7393TG5', GuideName: '7393TG5', Model: 'XT1063', IsRefereshSupported: true, Manufacturer: 'Motorola', DynamicGuideName: 'Android'},
            '7393TN3': {SKU: '7393TN3', GuideName: '7393TN3', Model: 'SAMSUNGNOTE3', IsRefereshSupported: true, Manufacturer: 'Samsung', DynamicGuideName: 'Android'},
            '7393TS4': {SKU: '7393TS4', GuideName: '7393TS4', Model: 'SAMSUNG S4', IsRefereshSupported: true, Manufacturer: 'SAMSUNG', DynamicGuideName: 'Android'},
            '7393TS5': {SKU: '7393TS5', GuideName: '7393TS5', Model: 'SAMSUNG S5', IsRefereshSupported: true, Manufacturer: 'Samsung', DynamicGuideName: 'Android'},
            '7393TX6': {SKU: '7393TX6', GuideName: '7393TX6', Model: 'NEXUS 6', IsRefereshSupported: true, Manufacturer: 'MOTOROLA', DynamicGuideName: 'Android'}
        },
        itemNumberRegEx: /^\d{10}$/,
        networkDevices: [
            {description: 'Meraki MX64 Cloud Managed Router', displayDescription: 'Cisco Firewall', deviceImageFile: 'FirewallMerakiMx64.png', wiringImageFile: 'WiringDiagramMerakiMx64.png', correctPort: '4', isServiceCenterConfig: false, isPortDetectable: false},
            {description: 'Meraki MS220-24P Cloud Managed PoE Switch', displayDescription: 'Cisco Switch', deviceImageFile: 'SwitchMerakiMs220-24.png', wiringImageFile: 'WiringDiagramMerakiMs220ServiceCenter.png', correctPort: '21', isServiceCenterConfig: true, isPortDetectable: true},
            {description: 'Meraki MS220-24P Cloud Managed PoE Switch', displayDescription: 'Cisco Switch', deviceImageFile: 'SwitchMerakiMs220-24.png', wiringImageFile: 'WiringDiagramMerakiMs220.png', correctPort: '22', isServiceCenterConfig: false, isPortDetectable: true},
            {description: 'SonicWALL TZ-210', displayDescription: 'SonicWALL', deviceImageFile: 'FirewallSonicWall.png', wiringImageFile: 'WiringDiagramSonicWallTz-210.png', correctPort: 'X5', isServiceCenterConfig: false, isPortDetectable: false}
        ],
        demo: false
    };

    app.value('config', config);
})();
