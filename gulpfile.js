/* ==========================================================================
   Gulpfile
   ========================================================================== */
var gulp = require('gulp');

// Load plugins
var plugins = require('gulp-load-plugins')();
var StreamQueue = require('streamqueue');

/* Paths
   -------------------------------------------------------------------------- */
var src = './src';
var dist = './dist';
var normalize = 'jspm_packages/github/necolas/normalize.css@3.0.3/normalize.css';

/* Tasks
   -------------------------------------------------------------------------- */
// Styles
gulp.task('styles', function() {
    var stream = new StreamQueue({ objectMode: true });

    stream.queue(gulp.src(normalize));

    return stream.done(gulp.src(src + '/styl/index.styl')
            .pipe(plugins.stylus())
            .pipe(plugins.autoprefixer({
                browsers: ['last 2 versions', 'ie >= 9'],
                cascade: false
            })))
        .pipe(plugins.concat('main.css'))
        .pipe(gulp.dest(dist));
});

// Watch
gulp.task('watch', function() {
    gulp.watch([src + '/styl/*.styl'], ['styles']);
});

// Build
gulp.task('build', function() {
    gulp.start('styles');
});

gulp.task('default', ['build']);