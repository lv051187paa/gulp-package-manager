"use strict";

const {src, dest, task, watch, series, parallel} = require("gulp");
const prefixer = require("gulp-autoprefixer");
const clean = require('gulp-clean');
const uglify = require("gulp-uglify");
const sass = require("gulp-sass");
const sourcemaps = require("gulp-sourcemaps");
const rigger = require("gulp-rigger");
const babel = require('gulp-babel');
const polyfiller = require('gulp-polyfiller');
const urlAdjuster = require('gulp-css-url-adjuster');
const rename = require("gulp-rename");
const cssmin = require("gulp-minify-css");
const htmlreplace = require('gulp-html-replace');
const imagemin = require("gulp-imagemin");
const pngquant = require("imagemin-pngquant");
const browserSync = require("browser-sync");
const plumber = require('gulp-plumber');
const notify = require("gulp-notify");
const reload = browserSync.reload;

const buildPath = './build';
const sourcePath = './src';

var path = {
    build: {
        //Тут мы укажем куда складывать готовые после сборки файлы
        html: `${buildPath}/`,
        js: `${buildPath}/js/`,
        css: `${buildPath}/css/`,
        img: `${buildPath}/img/`,
        fonts: `${buildPath}/fonts/`
    },
    src: {
        //Пути откуда брать исходники
        html: `${sourcePath}/*.html`, //Синтаксис src/*.html говорит gulp что мы хотим взять все файлы с расширением .html
        js: `${sourcePath}/js/main.js`, //В стилях и скриптах нам понадобятся только main файлы
        style: `${sourcePath}/style/main.scss`,
        img: `${sourcePath}/img/**/*.*`, //Синтаксис img/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
        fonts: `${sourcePath}/fonts/**/*.*`
    },
    watch: {
        //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
        html: `${sourcePath}/**/*.html`,
        js: `${sourcePath}/js/**/*.js`,
        style: `${sourcePath}/style/**/*.scss`,
        // img: "src/img/**/*.*",
        // fonts: "src/fonts/**/*.*"
    },
    clean: `${buildPath}`
};

var config = {
    server: {
        baseDir: `${buildPath}`
    },
    tunnel: false,
    host: "localhost",
    port: 9000,
    logPrefix: "SuperSite"
};

task("html:dev", function () {

    return src(path.src.html) //Выберем файлы по нужному пути
        .pipe(rigger()) //Прогоним через rigger
        .pipe(dest(path.build.html)) //Выплюнем их в папку build
        .pipe(reload({stream: true})); //И перезагрузим наш сервер для обновлений
});

task("js:dev", function () {
    return src(path.src.js) //Найдем наш main файл
        .pipe(sourcemaps.init()) //Инициализируем sourcemap
        .pipe(plumber())
        .pipe(rigger()) //Прогоним через rigger
        .on('error', notify.onError(
            {
                message: "<%= error.stack %>",
                title: "Shit happends! JS Error!"
            }))
        .pipe(sourcemaps.write()) //Пропишем карты
        .pipe(dest(path.build.js)) //Выплюнем готовый файл в build
        .pipe(reload({stream: true}));
});

task("style:dev", function () {
    return src(path.src.style) //Выберем наш main.scss
        .pipe(sourcemaps.init()) //То же самое что и с js
        .pipe(plumber())
        .pipe(sass()) //Скомпилируем
        .on('error', notify.onError(
            {
                message: "<%= error.message %>",
                title: "Shit happends! Sass Error!"
            }))
        .pipe(prefixer()) //Добавим вендорные префиксы
        .pipe(sourcemaps.write())
        .pipe(dest(path.build.css)) //И в build
        .pipe(reload({stream: true}));
});

task("image:dev", function () {
    return src(path.src.img) //Выберем наши картинки
        .pipe(dest(path.build.img)) //И бросим в build
    // .pipe(reload({ stream: true }));
});


// ============Build Tasks===============

task("clean", function () {
    return src(`${buildPath}`)
        .pipe(clean({force: true}));
});

task("html:build", function () {

    return src(path.src.html) //Выберем файлы по нужному пути
        .pipe(rigger()) //Прогоним через rigger
        .pipe(htmlreplace({
            'css': 'css/main.min.css',
            'js': 'js/main.min.js'
        }))
        .pipe(dest(path.build.html)) //Выплюнем их в папку build
});

task("js:buildMin", function () {
    return src(path.src.js) //Найдем наш main файл
        .pipe(rigger()) //Прогоним через rigger
        .pipe(babel({
            "presets": ["@babel/preset-env"]
        }))
        .on('error', notify.onError(
            {
                message: " <%= error.stack %>",
                title: "Shit happends! JS Error!"
            }))
        .pipe(uglify({
            toplevel: true
        })) //Сожмем наш js

        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(dest(path.build.js)) //Выплюнем готовый файл в build
});

task("style:buildMin", function () {
    return src(path.src.style) //Выберем наш main.scss
        .pipe(sass()) //Скомпилируем
        .on('error', notify.onError(
            {
                message: "<%= error.message %>",
                title: "Shit happends! Sass Error!"
            }))
        .pipe(urlAdjuster({replace: ['../../img', '../img']}))
        .pipe(prefixer()) //Добавим вендорные префиксы
        .pipe(cssmin()) //Сожмем
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(dest(path.build.css)) //И в build
});

task("fonts:build", function () {
    return src(path.src.fonts).pipe(dest(path.build.fonts));
});

task("image:build", function () {
    return src(path.src.img) //Выберем наши картинки
        .pipe(
            imagemin({
                //Сожмем их
                progressive: true,
                svgoPlugins: [{removeViewBox: false}],
                use: [pngquant()],
                interlaced: true
            })
        )
        .pipe(dest(path.build.img)) //И бросим в build
});

task("build", series(
    "clean",
    "html:build",
    "js:buildMin",
    "style:buildMin",
    "fonts:build",
    "image:build"
));

task("dev", series(
    "html:dev",
    "js:dev",
    "style:dev",
    "fonts:build",
    "image:dev"
));

task("watch", function () {
    watch(path.watch.html, series("html:dev"));
    watch(path.watch.style, series("style:dev"));
    watch(path.watch.js, series("js:dev"));
});

task("webserver", async function () {
    browserSync(config);
});

task("default", parallel("dev", "webserver", "watch"));
