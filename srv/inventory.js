/**
 * Created by larry on 3/3/2016.
 */
const request = require('request');
var config = require('./config');

const INVENTORY_LOOKUP_URL = 'https://' + config.apiHost + '/api/inventorylookup/';

var self = module.exports = {

    getItem: function(id, callback) {
        request({
            url: INVENTORY_LOOKUP_URL + id,
            headers: {
                'Authorization': config.apiAuthorization
            },
            rejectUnauthorized: false,
            json: true
        }, function (error, response, body) {
            if (error) {
                console.error(error);
                callback({error: error, item: null});
            }
            else if (response.statusCode === 200) {
                console.log(body);
                callback({error: null, item: body});
            }
            else {
                console.log('Server returned status', response.statusCode);
                console.log(body);
                callback({error: body, item: null});
            }
        });
    }

};
