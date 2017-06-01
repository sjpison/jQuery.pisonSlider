var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var webserver = require('gulp-webserver');
var rename = require('gulp-rename');
const fs = require('fs');
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var replace = require('gulp-replace');

// source
gulp.task('src_view',function() {
	gulp.src('working/src')
			.pipe(webserver({
				host:'localhost',
				// host:'0.0.0.0',
				livereload: true,
				directoryListing: false,
				open: true
			}));
});

// distribute
gulp.task('dist_view',function() {
	gulp.src('working/dist')
			.pipe(webserver({
				host:'localhost',
				// host:'0.0.0.0',
				livereload: true,
				directoryListing: false,
				open: true
			}));
});

gulp.task('combine', function () {
	gulp.src('working/src/pisonSlider/jquery.pisonSlider.js')
		.pipe(stripDebug())
		.pipe(rename('jquery.pisonSlider.min.js'))
		.pipe(uglify())
		.pipe(header(fs.readFileSync('working/src/SOURCE.HEADER')))
		.pipe(gulp.dest('working/dist/pisonSlider'));

 	gulp.src('working/src/pisonSlider/jquery.pisonSlider.css')
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(rename('jquery.pisonSlider.min.css'))
		.pipe(header(fs.readFileSync('working/src/SOURCE.HEADER')))
 		.pipe(gulp.dest('working/dist/pisonSlider/'));

	gulp.src('working/src/index.html')
		.pipe(replace('jquery.pisonSlider.','jquery.pisonSlider.min.'))
		.pipe(gulp.dest('working/dist'));
	gulp.src('working/src/single_image.html')
		.pipe(replace('jquery.pisonSlider.','jquery.pisonSlider.min.'))
		.pipe(gulp.dest('working/dist'));
});

gulp.task('build', ['combine'], function() {
	// copying
	gulp.src(['working/src/**/*',
						'!working/src/pisonSlider/jquery.pisonSlider*',
						'!working/src/SOURCE.*',
						'!working/src/index.html',
						'!working/src/single_image.html'
					])
			.pipe(gulp.dest('working/dist'));
	console.log('Build Completed');
});

gulp.task('default', ['build'], function() {
	// console.log('Build Completed');
});
