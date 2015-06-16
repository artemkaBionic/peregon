var express = require('express');

module.exports = function(io, data) {
// Express Router
    var router = express.Router();

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
