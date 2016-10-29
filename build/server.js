'use strict';

var gulp = require('gulp');

var util = require('util');
var browserSync = require('browser-sync');
var middleware = require('./proxy');
var nodemon = require('gulp-nodemon');

var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*']
});

var BROWSER_SYNC_RELOAD_DELAY = 500;

function browserSyncInit(baseDir, files, browser) {
    if ($.util.env.nosync) {
        //don't reload on file change
        files = [];
    }

    browser = browser === undefined ? 'default' : browser;

    var routes = null;
    if (baseDir === 'src' || (util.isArray(baseDir) && baseDir.indexOf('src') !== -1)) {
        routes = {
            // Should be '/bower_components': '../bower_components'
            // Waiting for https://github.com/shakyShane/browser-sync/issues/308
            '/bower_components': 'bower_components',
            '/data': 'data'
        };
    }

    browserSync.instance = browserSync.init(files, {
        startPath: '/index.html',
        server: {
            baseDir: baseDir,
            middleware: middleware,
            routes: routes
        },
        browser: browser
        //logLevel: 'debug'
    });
}

gulp.task('dev', function () {
    process.env.NODE_ENV = 'development';
    $.util.env.PORT = 4000;
    $.util.env.base_url = 'localhost:' + $.util.env.PORT;
    console.log($.util.env.base_url);
});

gulp.task('serve', ['dev', 'nodemon', 'watch'], function () {
    browserSyncInit([
        'src',
        '.tmp',
        'data'
    ], [
        'data/**/*.*',
        '.tmp/**/*.css',
        '.tmp/**/*.css.map',
        'src/assets/images/**/*',
        'src/**/*.html',
        'src/**/*.js'
    ]);
});

gulp.task('serve:dist', ['build'], function () {
    browserSyncInit('dist');
});

gulp.task('serve:e2e', ['wiredep', 'injector:js', 'injector:css'], function () {
    browserSyncInit(['src', '.tmp'], null, []);
});

gulp.task('serve:e2e-dist', ['build'], function () {
    browserSyncInit('dist', null, []);
});

gulp.task('nodemon', function (cb) {
    var called = false;
    return nodemon({
        // nodemon our expressjs server
        script: "srv/bin/www",
        // watch core server file(s) that require server restart on change
        watch: ["srv/**/*.*"],
        env: { 'PORT': $.util.env.PORT }
    })
        .on('start', function onStart() {
            // ensure start only got called once
            if (!called) { cb(); }
            called = true;
        })
        .on('restart', function onRestart() {
            // reload connected browsers after a slight delay
            setTimeout(function reload() {
                browserSync.reload({
                    stream: false   //
                });
            }, BROWSER_SYNC_RELOAD_DELAY);
        });
});
