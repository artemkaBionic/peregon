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

//config.winContent = '/usr/share/tftpd/winpe/default/*';
config.winContent = '/home/artem/usb/WinPe/*';

config.macContent = '/home/artem/usb/mac/MacRefresh.img';
//config.xboxContent = '/srv/media/bc76b9f7-02f9-42e3-a9b7-3383b5287f07/*';
config.xboxContent = '/home/artem/usb/xbox/*';

config.winVersionFile = '/home/artem/usb/WinPe/.version';
config.xboxVersionFile = '/home/artem/usb/xbox/.version';
config.macVersionFile = '/home/artem/usb/mac/.version';





module.exports = config;
