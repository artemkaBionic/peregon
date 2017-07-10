/**
 * Created by Larry on 9/16/2015.
 */
var config = {};

config.mediaPackagePath = '/srv/media';
config.packagPackagePath = '/srv/packages';
config.kioskDataPath = '/var/lib/kiosk';
config.apiHost = 'api.ar.appchord.com';
config.apiPort = 443;
config.apiAuthorization = 'Basic YXBwY2hvcmQuYWFyb25zLmFwaTplfjEjOUwkN0t6Zlt9MEo=';
config.api2Authorization = 'Basic YWFyb25zOllXRnliMjV6T2s1NU5UTjJjRlpU';
config.deviceUnlockTimeout = 3600000;
config.usbDeviceIdRegEx = /^sd[c-z]$/;

config.winPeContent = '/usr/share/tftpd/winpe/default/*';
config.winPeAppContent = '/srv/packages/default/*';
config.windowsContent = '/srv/packages/97fc1b7c-049f-4933-88e5-cb19362e3360';
config.macContent = '/srv/mac/default/MacRefresh.img';
config.xboxContent = '/srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/*';

config.winPeVersionFile = '/usr/share/tftpd/winpe/default/.version';
config.winPeAppVersionFile = '/srv/packages/default/.version';
config.windowsVersionFile = '/srv/packages/97fc1b7c-049f-4933-88e5-cb19362e3360/.version';
config.xboxVersionFile = '/srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/.version';
config.macVersionFile = '/srv/mac/default/.version';

config.usbXboxPartition = 1;
config.usbWindowsPartition = 2;
config.usbMacPartition = 3;
config.usbStatusPartition = 4;

config.usbXboxPartitionSize = 100;
config.usbMacPartitionSize = 8000;
config.usbStatusPartitionSize = 100;

module.exports = config;
