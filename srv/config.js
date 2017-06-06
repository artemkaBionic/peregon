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

config.winPeContent = '/usr/share/tftpd/winpe/default/*';
config.macContent = '/home/acadmin/MacRefresh.img';
config.xboxContent = '/srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/*';

config.winPeVersionFile = '/usr/share/tftpd/winpe/default/.version';
config.xboxVersionFile = '/srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/.version';
config.macVersionFile = '/home/acadmin/MacRefresh.version';

config.usbXboxPartition = 1;
config.usbWindowsPartition = 2;
config.usbMacPartition = 3;
config.usbStatusPartition = 4;

module.exports = config;
