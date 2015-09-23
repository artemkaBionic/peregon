var express = require('express');
var socket_io = require( "socket.io" );
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var config = require('./config');

// Express
var app = express();

// Socket.io
var io           = socket_io();
app.io           = io;

// Common data
var data = {};
data.devices = [];

var routes = require('./routes')(io, data);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in ../src/assets/images
//app.use(favicon(__dirname + '../src/assets/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// socket.io events
io.on( 'connection', function( socket )
{
    console.log( 'A client connected' );
    socket.on('device_apply', function (data) {
        console.log( 'A client requested to apply "' + data.media.name + '" to the ' + data.device.type + ' device ' + data.device.id );

        var mediaPackagePath = path.join(config.mediaPackagePath, data.media.id);
        var mediaPackageFile = path.join(mediaPackagePath, '.package.json');
        var mediaPackage = JSON.parse(fs.readFileSync(mediaPackageFile, 'utf8'));

        var fileSystem = 'fat32';
        if (mediaPackage.subtype === "xbox-one") {
            fileSystem = 'ntfs';
        }

        var python = childProcess.spawn( 'python', ['/opt/kiosk/apply_media.py', '--package', data.media.id, '--device', data.device.id, '--file-system', fileSystem] );
        python.on('close', function(code){
            io.emit('device_apply_progress', 100);
        });
    });
});

module.exports = app;
