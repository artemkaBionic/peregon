'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var nodemon = require('gulp-nodemon');

require('require-dir')('./build');

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});

gulp.task('help', $.taskListing);
