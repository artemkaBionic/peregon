'use strict';

var gulp = require('gulp');

var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*']
});


function changed(file) {
    //console.log('Watch: ' + file.path);
}

gulp.task('watch', ['wiredep', 'injector:css', 'injector:js'], function () {
        gulp.watch('src/{app,components,styles}/**/*.scss', ['injector:css']).on('change', changed);
        gulp.watch('src/{app,components}/**/*.js', ['injector:js']).on('change', changed);
        gulp.watch('src/assets/images/**/*', ['images']).on('change', changed);
        gulp.watch('bower.json', ['wiredep']).on('change', changed);
});
