"use strict";

const gulp = require('gulp');
const $    = require('gulp-load-plugins')({
	overridePattern: false,
	pattern: ['rimraf', 'browser-sync', 'pump', 'cssnano', 'postcss-*']
});

const path = {
	src: {
		html:   'src/*.html',
		style:  'src/scss/main.scss',
		js:     'src/js/main.js',
		img:    'src/img/**/*.*',
		sprite: 'src/img/icons/*.*',
		fonts:  'src/fonts/**/*.*'
	},
	dist: {
		html:        'dist/',
		style:       'dist/css/',
		spriteStyle: 'src/scss/components/',
		js:          'dist/js/',
		img:         'dist/img/',
		spriteImg:   'dist/img/',
		fonts:       'dist/fonts/'
	},
	watch: {
		html:  'src/*.html',
		style: 'src/scss/**/*.scss',
		js:    'src/js/**/*.js',
		img:   'src/img/**/*.*',
		fonts: 'src/fonts/**/*.*'
	}
};

const plumberNotifier = $.plumber({
	errorHandler: $.notify.onError({
		title: 'Gulp Error!',
		message: '<%= error.message %>'
	})
});

const serverConf = {
	server: {
		baseDir: './dist'
	},
	notify: false,
	tunnel: 'venom'
};

const imageminConf = [
	$.imagemin.gifsicle({ interlaced: true }),
	$.imagemin.jpegtran({ progressive: true }),
	$.imagemin.optipng({ optimizationLevel: 5 }),
	$.imagemin.svgo({
		plugins: [
			{ removeViewBox: true },
			{ cleanupIDs: false }
		]
	})
];

const spritesmithConf = {
	imgName:   'sprite.png',
	imgPath:   '../img/sprite.png',
	cssName:   '_sprite.scss',
	algorithm: 'binary-tree',
	cssVarMap: sprite => {
		sprite.name = `icon-${sprite.name}`;
	}
};

// "set NODE_ENV=production" or "set NODE_ENV=development" in console
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

gulp.task('build:html', () => {
	return gulp.src(path.src.html)
		.pipe($.if(!isDevelopment, $.htmlmin({ collapseWhitespace: true })))
		.pipe(gulp.dest(path.dist.html))
		.pipe($.browserSync.reload({stream: true}));
});

gulp.task('build:sass', () => {
	const postcssPlugins = [
		$.postcssUncss({
			html: [path.src.html],
			// ignore: ['.active'] // - list of selectors that should not be removed
		}),
		$.cssnano()
	];

	return gulp.src(path.src.style)
		.pipe($.plumber(plumberNotifier))
		.pipe($.if(isDevelopment, $.sourcemaps.init()))
		.pipe($.wait(100)) // - delay 100ms
		.pipe($.sass())
		.pipe($.autoprefixer())
		.pipe($.if(!isDevelopment, $.postcss( postcssPlugins )))
		.pipe($.if(isDevelopment, $.sourcemaps.write()))
		.pipe(gulp.dest(path.dist.style))
		.pipe($.browserSync.reload({stream: true}));
});

gulp.task('build:js', () => {
	return gulp.src(path.src.js)
		.pipe($.plumber(plumberNotifier))
		.pipe($.rigger()) // - include files
		.pipe($.if(isDevelopment, $.sourcemaps.init()))
		.pipe($.babel({ presets: ['env'] }))
		.pipe($.if(!isDevelopment, $.uglify())) // - compress js
		.pipe($.if(isDevelopment, $.sourcemaps.write()))
		.pipe(gulp.dest(path.dist.js))
		.pipe($.browserSync.reload({stream: true}));
});

gulp.task('build:sprite', () => {
	var spriteData = gulp.src(path.src.sprite).pipe($.spritesmith(spritesmithConf));
	spriteData.img.pipe(gulp.dest(path.dist.spriteImg));
	spriteData.css.pipe(gulp.dest(path.dist.spriteStyle));
});

gulp.task('build:img', ['build:sprite'], () => {
	return gulp.src([path.src.img, '!' + path.src.sprite])
		.pipe($.changed(path.dist.img)) // will get the files only that changed since the last time it was run
		.pipe($.imagemin(imageminConf))
		.pipe($.debug())
		.pipe(gulp.dest(path.dist.img))
		.pipe($.browserSync.reload({ stream: true }));
});

gulp.task('build:fonts', () => gulp.src(path.src.fonts)
	.pipe(gulp.dest(path.dist.fonts)));

gulp.task('clean', callback => $.rimraf('dist', callback));

gulp.task('webserver', () => {
	$.browserSync(serverConf);
});

gulp.task('build', [
	'build:html',
	'build:sass',
	'build:fonts',
	'build:js',
	'build:img'
]);

gulp.task('watch', () => {
	gulp.watch(path.watch.html,  ['build:html']);
	gulp.watch(path.watch.style, ['build:sass']);
	gulp.watch(path.watch.js,    ['build:js']);
	gulp.watch(path.watch.img,   ['build:img']);
	gulp.watch(path.watch.fonts, ['build:fonts']);
});

gulp.task('default', ['build', 'webserver', 'watch']);
