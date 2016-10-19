(function() {
    'use strict';

    var app = angular.module('app');

    var config = {
        name: 'Aarons',
        appTitle: 'Aarons Portal',
        version: '1.0.1',
        logoImage: '/assets/images/AaronsLogo.png',
        packageIndex: '/assets/package-index.json',
        guidesPath: '/assets/guides',
        guidesIndexFile: 'index.html',
        guides: [
            {SKU: '7339F74', GuideName: '7339F74', Model: 'Xbox One Console', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339FB1', GuideName: '7339FB1', Model: 'Xbox One 500GB with Kinect and Bonus Game', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339FB2', GuideName: '7339FB2', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339NX1', GuideName: '7339NX1', Model: 'Xbox One with 2 Controllers Direct', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XB1', GuideName: '7339XB1', Model: 'Xbox One with Kinect 8 Core 500BG Blu-Ray HDMI 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XB2', GuideName: '7339XB2', Model: 'Xbox One with Kinect 500 GB Blu-Ray HDMI Play Charge', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XB3', GuideName: '7339XB3', Model: 'Xbox One with Kinect 500GB Forza 5 Play Charge Unit', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XB5', GuideName: '7339XB5', Model: 'Xbox One with Kinect 500GB', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XC1', GuideName: '7339XC1', Model: 'Xbox One 500GB Includes Game', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XC2', GuideName: '7339XC2', Model: 'Xbox One 500GB without Kinect', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XC3', GuideName: '7339XC3', Model: 'Xbox One 500GB with Bonus Game and 1 Controller', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'},
            {SKU: '7339XMH', GuideName: '7339XMH', Model: 'Xbox One Bundle', IsRefereshSupported: true, Manufacturer: 'Microsoft', DynamicGuideName: 'XboxOne'}
        ],
        itemNumberRegEx: /^\d{10}$/,
        skuRegEx: /^73\w{5}$/,
        networkDevices: [
            {Description: 'Meraki MX64 Cloud Managed Router', DeviceImageFile: 'FirewallMx64.png', WiringImageFile: 'WiringDiagramMerakiMx64.png', CorrectPort: '4', IsServiceCenterConfig: false, IsPortDetectable: false},
            {Description: 'Meraki MS220-24P Cloud Managed PoE Switch', DeviceImageFile: 'SwitchMs220-24.png', WiringImageFile: 'WiringDiagramMerakiMs220ServiceCenter.png', CorrectPort: '21', IsServiceCenterConfig: true, IsPortDetectable: true},
            {Description: 'Meraki MS220-24P Cloud Managed PoE Switch', DeviceImageFile: 'SwitchMs220-24.png', WiringImageFile: 'WiringDiagramMerakiMs220.png', CorrectPort: '22', IsServiceCenterConfig: false, IsPortDetectable: true},
            {Description: 'SonicWALL TZ-210', DeviceImageFile: 'FirewallSonicWall.png', WiringImageFile: 'WiringDiagramSonicWallTz-210.png', CorrectPort: 'X5', IsServiceCenterConfig: false, IsPortDetectable: false}
        ],
        demo: false
    };

    app.value('config', config);
})();
