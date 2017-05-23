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
config.winContent = '/home/artem/WinPe/*';

config.macContent = '/home/artem/mac_hfs.img';
config.xboxContent = '/';

config.winVersionFile = '/home/artem/usb/WinPe/.version';
config.xboxVersionFile = '/home/artem/usb/xbox/.version';
config.macVersionFile = '/home/artem/usb/mac/.version';





module.exports = config;
