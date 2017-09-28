var logger = require('morgan'),
    winston = require('winston');

require('winston-loggly');

winston.add(winston.transports.Loggly, {
    token: '264392d7-c070-4884-87cd-ed0331e191ec',
    subdomain: 'basechord',
    tags: ['Winston-NodeJS'],
    json: true
});

module.exports = function (level, msg, metadata) {
    winston.log(level, msg, metadata);
};
