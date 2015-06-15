'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var nodemon = require('gulp-nodemon');

require('require-dir')('./build');

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});

gulp.task('help', $.taskListing);

gulp.task('nodemon', function (cb) {
    return nodemon({
        script: 'srv/bin/www',
        ext: 'html js',
        ignore: ['public/*', 'node_modules/*'],
        env: { 'NODE_ENV': 'development'}
    }).on('restart');
});
