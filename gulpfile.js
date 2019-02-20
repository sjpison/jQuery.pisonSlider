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

var src_dir = 'working/src';
var dist_dir = 'working/dist';
var proj_name = 'pisonSlider';

// source
gulp.task('src_view',function() {
	return gulp.src(src_dir)
			.pipe(webserver({
				host:'localhost',
				// host:'0.0.0.0',
				livereload: true,
				directoryListing: false,
				open:true
			}));
});

// distribute
gulp.task('dist_view',function() {
	return gulp.src(dist_dir)
			.pipe(webserver({
				host:'localhost',
				// host:'0.0.0.0',
				livereload: true,
				directoryListing: false,
				open:true
			}));
});

gulp.task('js-build', function() {
	return gulp.src(src_dir+'/**/*.js')
		.pipe(concat('jquery.'+proj_name+'.min.js'))
		.pipe(stripDebug())
		.pipe(uglify())
		.pipe(header(fs.readFileSync(src_dir+'/SOURCE.HEADER')))
		.pipe(gulp.dest(dist_dir+'/'+proj_name));
})

gulp.task('css-build', function() {
	return gulp.src(src_dir+'/**/*.css')
		.pipe(concat('jquery.'+proj_name+'.min.css'))
	   .pipe(cleanCSS({compatibility: 'ie8'}))
	   .pipe(rename('jquery.'+proj_name+'.min.css'))
	   .pipe(header(fs.readFileSync(src_dir+'/SOURCE.HEADER')))
	   .pipe(gulp.dest(dist_dir+'/'+proj_name));
})

gulp.task('html-build', function () {
	return gulp.src(src_dir+'/**/*.html')
		.pipe(replace('jquery.'+proj_name+'.','jquery.'+proj_name+'.min.'))
		.pipe(gulp.dest(dist_dir));
});

gulp.task('build', gulp.series(gulp.parallel('js-build','css-build','html-build'), function() {
	// copying
	return gulp.src([src_dir+'/**/*',
							'!'+src_dir+'/'+proj_name+'/jquery.'+proj_name+'*',
							'!'+src_dir+'/SOURCE.*',
							'!'+src_dir+'/index.html',
							'!'+src_dir+'/single_image.html'
						])
				.pipe(gulp.dest(dist_dir))
				.on('end', ()=> { console.log('Build Completed!'); })
}));

gulp.task('default', gulp.series('build'));
