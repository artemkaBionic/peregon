'use strict';

var gulp = require('gulp');

var util = require('util');
var config = require('gulp-ng-config');
var file = require('gulp-file');
var replace = require('gulp-replace');
var importCss = require('../build/import-css'); //Workaround bug https://github.com/yuguo/gulp-import-css/issues/7


var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

function processScss(file, container) {
    return $.rubySass(file, { verbose: false, sourcemap: true, container: container, loadPath: [
        process.cwd()
    ] })
        .on('error', function (err) {
            console.error('Error', err.message);
        })
        .pipe(replace('@import url(bower_components/', '@import url(../bower_components/')) //change url to css
        .pipe($.autoprefixer({
            browsers: ['last 2 versions', 'ios 6', 'android 4']
        }))
        .pipe($.sourcemaps.write('.', {
            includeContent: false
        }))
        .pipe(gulp.dest('.tmp/app/'));
}

gulp.task('styles:index', ['wiredep'], function () {
    return processScss('src/styles/index.scss', 'index');
});

gulp.task('styles:vendor', function () {
    return processScss('src/styles/vendor.scss', 'vendor');
});

gulp.task('styles', ['styles:index', 'styles:vendor']);

gulp.task('injector:css', ['styles'], function () {
    return gulp.src('src/index.html')
        .pipe($.inject(gulp.src([
            '.tmp/{app,components}/**/*.css',
            '!.tmp/app/index.css',
            '!.tmp/app/vendor.css',
            '!.tmp/app/**/*.css'
        ], {read: false}), {
            ignorePath: '.tmp',
            addRootSlash: false
        }))
        //.pipe($.changed('src/'))
        .pipe(gulp.dest('src/'));
});

gulp.task('jshint', function () {
    return gulp.src([
        'src/{app,components}/**/*.js',
        '!src/app/app.env.js', //TODO: temporary disable check. https://github.com/ajwhite/gulp-ng-config/issues/12
        '!src/components/lib/**/*.js'])
        .pipe($.jshint('./.jshintrc'))
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('jscs', function () {
    return gulp.src([
        'src/{app,components}/**/*.js',
        '!src/app/app.env.js',
        '!src/components/lib/**/*.js'])
        .pipe($.jscs('./.jscsrc'));
});

gulp.task('analyze', ['jshint', 'jscs']);

gulp.task('injector:js', ['env', 'analyze', 'injector:css'], function () {
    return gulp.src('src/index.html')
        .pipe($.inject(
            gulp.src([
                'src/{app,components}/**/*.js',
                '!src/{app,components}/**/*.spec.js',
                '!src/{app,components}/**/*.mock.js',
                '!src/app/app.config*.js'
            ])
                .pipe($.angularFilesort()), {
                ignorePath: 'src',
                addRootSlash: false
            }))
        .pipe(gulp.dest('src/'));
});

gulp.task('partials', function () {
    return gulp.src('src/{app,components}/**/*.html')
        .pipe($.minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe($.angularTemplatecache('templateCacheHtml.js', {
            module: 'app'
        }))
        .pipe(gulp.dest('.tmp/inject/'));
});

gulp.task('html', ['wiredep', 'injector:css', 'injector:js', 'partials'], function () {
    var htmlFilter = $.filter('*.html');
    var jsFilter = $.filter('**/*.js');
    var cssFilter = $.filter('**/*.css');
    var assets;

    return gulp.src('src/*.html')
        .pipe($.inject(gulp.src('.tmp/inject/templateCacheHtml.js', {read: false}), {
            starttag: '<!-- inject:partials -->',
            ignorePath: '.tmp',
            addRootSlash: false
        }))
        .pipe(assets = $.useref.assets())
        //.pipe($.rev()) //TODO: Temporary disable revisions
        .pipe(jsFilter)
        .pipe($.debug({title: 'js'}))
        .pipe($.ngAnnotate({ add: true, single_quotes: true }))
        .pipe($.uglify({preserveComments: $.uglifySaveLicense}))
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe($.debug({title: 'css'}))
        .pipe(replace('@import url(../bower_components/', '@import url(../../bower_components/')) //change url to css
        .pipe(replace('bower_components/bootstrap-sass-official/assets/fonts/bootstrap', 'fonts'))
        .pipe(replace('../bower_components/open-sans/fonts', '../fonts/open-sans'))
        .pipe(replace('../bower_components/p0rtal/src/package/fonts/apc-icons/fonts', '../fonts/apc-icons'))
        .pipe(importCss()) //inlining css @import
        .pipe($.csso())
        .pipe(replace('/fonts/fontawesome-', '/fonts/font-awesome/fontawesome-'))
        .pipe(cssFilter.restore())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace())
        .pipe(htmlFilter)
        .pipe($.minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(htmlFilter.restore())
        .pipe(gulp.dest('dist/public/'))
        .pipe($.size({title: 'dist/public/', showFiles: true}));
});

gulp.task('guides', function () {
    return gulp.src('src/assets/guides/**/*')
        .pipe(gulp.dest('dist/public/assets/guides/'));
});

gulp.task('images', function () {
    return gulp.src('src/assets/images/**/*')
        .pipe($.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest('dist/public/assets/images/'));
});

gulp.task('videos', function () {
    return gulp.src('src/assets/videos/**/*')
        .pipe(gulp.dest('dist/public/assets/videos/'));
});

gulp.task('fonts', ['fonts:font-awesome', 'fonts:open-sans', 'fonts:apc-icons'], function () {
    return gulp.src($.mainBowerFiles())
        .pipe($.filter('**/*.{eot,svg,ttf,woff,woff2}'))
        .pipe($.flatten())
        .pipe(gulp.dest('dist/public/fonts/'));
});

gulp.task('fonts:font-awesome', function () {
    return gulp.src('bower_components/font-awesome/fonts/**/*.{eot,svg,ttf,woff,woff2}')
        .pipe(gulp.dest('dist/public/fonts/font-awesome'));
});

gulp.task('fonts:open-sans', function () {
    return gulp.src('bower_components/open-sans/fonts/**/*.{eot,svg,ttf,woff}')
        .pipe(gulp.dest('dist/public/fonts/open-sans'));
});

gulp.task('fonts:apc-icons', function () {
    return gulp.src('bower_components/p0rtal/src/package/fonts/**/*.{eot,svg,ttf,woff}')
        .pipe($.flatten())
        .pipe(gulp.dest('dist/public/fonts/apc-icons'));
});

gulp.task('mics', function () {
    return gulp.src([
        'src/*.ico',
        'src/app.config.js'
    ])
        .pipe(gulp.dest('dist/public/'));
});

gulp.task('copySrv', function () {
    gulp.src([
        './srv/bin/**/*',
        './srv/usbonly/**/*',
        './srv/simultaneous/**/*',
        './srv/session_storage/**/*',
        './srv/views/**/*',
        './srv/*.js',
        './srv/*.json'
    ],{
        "base" : "./srv"
    })
        .pipe(gulp.dest('dist'));
});


gulp.task('clean', function (done) {
    $.del(['dist/public/', '.tmp/'], done);
});

gulp.task('env', function () {
    var base_url = $.util.env.base_url || '';

    var env = '{ "env": { "baseUrl": "' + base_url + '"} }';

    return file('app.env.json', env, {src: true})
        .pipe(config('app.env'))
        .pipe(gulp.dest('src/app'));
});

gulp.task('build', ['html', 'guides', 'images', 'videos', 'fonts', 'mics', 'copySrv']);
