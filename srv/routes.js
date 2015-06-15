var express = require('express');

module.exports = function(io, data) {
// Express Router
    var router = express.Router();

    /* GET home page. */
    router.get('/', function (req, res) {
        console.log('Sending index');
        res.sendFile('index.html');
    });

    ///* GET partial view. */
    //router.get('/partials/:name', function (req, res) {
    //    console.log('Rendering partial: ' + req.params.name);
    //    var name = req.params.name;
    //    res.render('partials/' + name);
    //});
    //
    ///* Send guide requests to the index to be handled by the angular routeProvider */
    //router.get('/guide/:name', function (req, res) {
    //    console.log('Handling request for guide: ' + req.params.name);
    //    res.render('index');
    //});
    //
    ///* Send media requests to the index to be handled by the angular routeProvider */
    //router.get('/media/:name', function (req, res) {
    //    console.log('Handling request for media type: ' + req.params.name);
    //    res.render('index');
    //});

    router.post('/event/:name', function (req, res) {
        var event = {};
        event.name = req.params.name;
        event.data = req.body;

        console.log(event.name + ' event has been reported.');

        if (event.name === "media_add") {
            if (event.data.mediaType === "usb") {
                newUsbDevice = {};
                data.media.usb.push(newUsbDevice);
            }
        }

        io.emit('event', event);
        res.send();
    });

    return router;
};
