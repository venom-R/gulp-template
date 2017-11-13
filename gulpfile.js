'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const rimraf = require('rimraf');
const autoprefixer = require('gulp-autoprefixer');
const cleanCss = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const notify = require('gulp-notify');
const uglify = require('gulp-uglify');
const pump = require('pump');
const watch = require('gulp-watch');
const uncss = require('gulp-uncss');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync');
const rigger = require('gulp-rigger');
const gulpIf = require('gulp-if');
const plumber = require('gulp-plumber');
const spritesmith = require('gulp.spritesmith');
const changed  = require('gulp-changed');
const debug  = require('gulp-debug');

const plumberNotifier = plumber({
	errorHandler: notify.onError({
		title: 'Gulp Error!',
		message: "<%= error.message %>"
	})
});

const path = {
		src: {
			html: 'src/*.html',
			style: 'src/scss/main.scss',
			js: 'src/js/main.js',
			img: 'src/img/**/*.*',
			sprite: 'src/img/icons/*.*',
			fonts: 'src/fonts/**/*.*'
		},
		dist: {
			html: 'dist/',
			style: 'dist/css/',
			spriteStyle: 'src/scss/components/',
			js: 'dist/js/',
			img: 'dist/img/',
			spriteImg: 'src/img/',
			fonts: 'dist/fonts/'
		},
		watch: {
			html: 'src/*.html',
			style: 'src/scss/**/*.scss',
			js: 'src/js/**/*.js',
			img: 'src/img/**/*.*',
			fonts: 'src/fonts/**/*.*'
		}
	};

const serverConf = {
	server: {
		baseDir: './dist'
	},
	notify: false
};

const imageminConf = [
	imagemin.gifsicle({ interlaced: true }),
	imagemin.jpegtran({ progressive: true }),
	imagemin.optipng({ optimizationLevel: 5 }),
	imagemin.svgo({
		plugins: [
			{ removeViewBox: true },
			{ cleanupIDs: false }
		]
	})
];

const spritesmithConf = {
	imgName: 'sprite.png',
	imgPath: '../img/sprite.png',
	cssName: '_sprite.scss',
	algorithm: 'binary-tree',
	cssVarMap: function (sprite) {
		sprite.name = 'icon-' + sprite.name;
	}
}

// "set NODE_ENV=production" or "set NODE_ENV=development" in console
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

gulp.task('build:html', function () {
	return gulp.src(path.src.html)
				.pipe(rigger())
				.pipe(gulpIf(!isDevelopment, htmlmin({ collapseWhitespace: true })))
				.pipe(gulp.dest(path.dist.html))
				.pipe(browserSync.reload({stream: true}));
});

gulp.task('build:sass', function () {
	return gulp.src(path.src.style)
				.pipe(plumber(plumberNotifier))
				.pipe(gulpIf(isDevelopment, sourcemaps.init()))
				.pipe(sass())
				.pipe(gulpIf(!isDevelopment, uncss({ // - remove unused css
					html: ['src/index.html']
				})))
				.pipe(autoprefixer())
				.pipe(gulpIf(!isDevelopment, cleanCss())) // - compress css
				.pipe(gulpIf(isDevelopment, sourcemaps.write()))
				.pipe(gulp.dest(path.dist.style))
				.pipe(browserSync.reload({stream: true}));
});

gulp.task('build:js', function () {
	return gulp.src(path.src.js)
				.pipe(plumber(plumberNotifier))
				.pipe(rigger()) // - include files
				.pipe(gulpIf(isDevelopment, sourcemaps.init()))
				.pipe(gulpIf(!isDevelopment, uglify())) // - compress js
				.pipe(gulpIf(isDevelopment, sourcemaps.write()))
				.pipe(gulp.dest(path.dist.js))
				.pipe(browserSync.reload({stream: true}));
});

gulp.task('build:sprite', function () {
	var spriteData = gulp.src(path.src.sprite)
			.pipe(spritesmith(spritesmithConf));

		spriteData.img.pipe(gulp.dest(path.dist.spriteImg));
		spriteData.css.pipe(gulp.dest(path.dist.spriteStyle));

});

gulp.task('build:img', ['build:sprite'], function () {
	return gulp.src([path.src.img, '!' + path.src.sprite])
				.pipe(changed(path.dist.img)) // will only get the files that changed since the last time it was run
				.pipe(imagemin(imageminConf))
				.pipe(debug())
				.pipe(gulp.dest(path.dist.img))
				.pipe(browserSync.reload({ stream: true }))
});

gulp.task('build:fonts', function () {
	return gulp.src(path.src.fonts)
				.pipe(gulp.dest(path.dist.fonts))
});

gulp.task('clean', function (callback) {
	return rimraf('dist', callback);
});

gulp.task('webserver', function () {
	browserSync(serverConf);
});

gulp.task('build', [
	'build:html',
	'build:sass',
	'build:fonts',
	'build:js',
	'build:img'
]);

gulp.task('watch', function () {
	gulp.watch(path.watch.html, ['build:html']);
	gulp.watch(path.watch.style, ['build:sass']);
	gulp.watch(path.watch.js, ['build:js']);
	gulp.watch(path.watch.img, ['build:img']);
	gulp.watch(path.watch.fonts, ['build:fonts']);
});

gulp.task('default', ['build', 'webserver', 'watch']);
