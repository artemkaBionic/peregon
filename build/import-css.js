'use strict';
var path = require('path'),
    fs = require('fs'),
    rework = require('rework'),
    reworkImporter = require('rework-importer'),
    through = require('through2');

module.exports = function() {

    return through.obj(function(file, enc, cb) {
        try {
            var processedCss = rework(String(file.contents), 'utf-8')
                .use(reworkImporter({
                    path: file.path,
                    base: file.base,
                    preProcess: function(ast, options) {
                        return ast
                            .use(rework.url(function(url) {
                                var srcDir, resourcePath, destDir;

                                if (isAbsoluteUrl(url) || isRootRelativeUrl(url) || (path.extname(url) !== 'css')) {
                                    return url;
                                }
                                srcDir = path.dirname(options.path);
                                resourcePath = path.resolve(srcDir, url);
                                destDir = path.dirname(file.path);

                                return path.relative(destDir, resourcePath);
                            }));
                    }
                }))
                .toString();
        } catch(err) {
            this.emit('error', new Error('Import CSS error: ', err));
            return cb();
        }

        file.contents = new Buffer(processedCss);
        this.push(file);
        cb();
    });

    function isAbsoluteUrl(url) {
        return (/^[\w]+:\/\/./).test(url);
    }

    function isRootRelativeUrl(url) {
        return url.charAt(0) === '/';
    }
};
