'use strict';

var gulp = require('gulp');
var fs = require('fs');
var gh = require('gulp-gh-pages');
var s3 = require('gulp-s3');
var util = require('gulp-util');

var aws;

gulp.task('deploy', ['build'], function () {
    var options = {
        message: 'Update [timestamp] --skip-ci'
    };

    return gulp.src('./dist/public/**/*')
        .pipe(gh(options));
});

gulp.task('deploy:aws', ['deploy:env', 'build'], function() {
    var options = { headers: {'Cache-Control': 'public'} };
    return gulp.src('./dist/public/**')
        .pipe(s3(aws.config, options));
});

gulp.task('deploy:env', function() {
    //allow to redefine AWS settings
    if (util.env.aws) {
        aws = require('../' + util.env.aws);
    }
    util.env.base_url = aws.config.url;
});


/*
 Init repository:

 git checkout --orphan gh-pages
 git rm -rf .
 touch README.md
 git add README.md
 git commit -m "Init gh-pages"
 git push --set-upstream origin gh-pages
 git checkout master
 */
