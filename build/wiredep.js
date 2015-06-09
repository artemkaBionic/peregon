'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*']
});

// inject bower components
gulp.task('wiredep', function () {
    var wiredep = require('wiredep').stream;

    return gulp.src('src/index.html')
        .pipe(wiredep({
            directory: 'bower_components',
            exclude: [/bootstrap-sass-official/, /bootstrap\.css/],
            dependencies: true,
            devDependencies: true,
            onFileUpdated: function(filePath) {
                console.log(filePath)
            }
        }))
        //.pipe($.changed('src'))
        .pipe(gulp.dest('src'));
});
