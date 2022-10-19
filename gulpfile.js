import gulp from "gulp";
import gulpSass from "gulp-sass";
import cleanCSS from "gulp-clean-css";
import autoprefixer from "gulp-autoprefixer";
import rename from "gulp-rename";
import htmlmin from "gulp-htmlmin";
import concat from "gulp-concat";
import imagemin from "gulp-imagemin";
import uglify from "gulp-uglify";
import babel from "gulp-babel";
import gulpSvgSprite from "gulp-svg-sprite";
import svgmin from "gulp-svgmin";
import webpack from "webpack-stream";
import browserSync from "browser-sync";
import dartSass from "sass";
import cheerio from "gulp-cheerio";
import replace from "gulp-replace";
import webp from "gulp-webp";
import webpHtml from "gulp-webp-html";
import fileInclude from "gulp-file-include";
import ttf2woff from "gulp-ttf2woff";
import ttf2woff2 from "gulp-ttf2woff2";
import fonter from "gulp-fonter";
import fs from "fs";
import path from "path";

const sass = gulpSass(dartSass);

gulp.task("server", function () {
  browserSync({
    server: {
      baseDir: "dist",
    },
  });
});

gulp.task("watch", function () {
  gulp.watch("src/sass/**/*.+(scss|sass|css)", gulp.parallel("styles"));
  gulp.watch("src/js/*.js", gulp.parallel("compress"));
  gulp.watch("src/**/*.html").on("change", gulp.parallel("html"));
  gulp.watch("src/img/*").on("all", gulp.parallel("images"));
  gulp.watch("src/svg/svgSprite/*").on("all", gulp.parallel("svgSprite"));
  gulp
    .watch("src/svg/svgSpriteHard/*")
    .on("all", gulp.parallel("svgSpriteHard"));
  gulp.watch("src/fonts/**/*").on("all", gulp.parallel("fonts"));
});

gulp.task("html", function () {
  return gulp
    .src("src/index.html")
    .pipe(
      fileInclude({
        prefix: "@@",
        basepath: "./src/partHtml",
      })
    )
    .pipe(webpHtml())
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.stream());
});

gulp.task("styles", function () {
  return gulp
    .src("src/sass/**/*.+(scss|sass)")
    .pipe(sass({ outputStyle: "compressed" }).on("error", sass.logError))
    .pipe(rename({ suffix: ".min", prefix: "" }))
    .pipe(autoprefixer())
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(concat("style-min.css"))
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.stream());
});
// JS
gulp.task("compress", function () {
  return gulp
    .src("src/js/index.js")
    .pipe(
      webpack({
        mode: "development", // can change on production
        output: {
          filename: "min.js",
        },
      })
    )
    .pipe(
      babel({
        presets: ["@babel/env"],
      })
    )
    .pipe(uglify())
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.stream());
});

gulp.task("svgSprite", function () {
  return gulp
    .src("src/svg/svgSprite/*.svg")
    .pipe(
      svgmin({
        js2svg: {
          pretty: true,
        },
      })
    )
    .pipe(
      cheerio({
        run: function ($, file) {
          $("[fill]").removeAttr("fill");
          $("[stroke]").removeAttr("stroke");
          $("[style]").removeAttr("style");
        },
        parserOptions: { xmlMode: true },
      })
    )
    .pipe(replace("&gt;", ">"))
    .pipe(
      gulpSvgSprite({
        mode: {
          symbol: {
            sprite: "../sprites/sprite-simple.svg",
            inline: true,
          },
        },
      })
    )
    .pipe(gulp.dest("dist"));
});

gulp.task("svgSpriteHard", function () {
  return gulp.src("src/svg/svgClear/*.svg").pipe(gulp.dest("dist/sprites/svg"));
});

// fonts
//convert otf fonts in ttf
gulp.task("otf2ttf", function () {
  return gulp
    .src("src/fonts/**/*")
    .pipe(
      fonter({
        formats: ["ttf"],
      })
    )
    .pipe(gulp.dest("src/fonts/"));
});

gulp.task("fonts", function () {
  if (fs.readFileSync("src/sass/_fonts.sass") !== "")
    fs.truncateSync("src/sass/_fonts.sass", 0); // clear file

  fs.readdir("dist/fonts", (err, files) => {
    // clear a folder in dist (fonts)
    if (files) {
      for (const file of files) {
        fs.unlink(path.join("dist/fonts", file), cb);
      }
    }
  });

  createFonts(ttf2woff);
  return createFonts(ttf2woff2).pipe(browserSync.stream());
});

function createFonts(callback) {
  return gulp
    .src(["src/fonts/*.ttf"])
    .pipe(callback())
    .pipe(gulp.dest("dist/fonts"));
}

// need for start a custom function
gulp.task("createStyleFonts", async function () {
  return new Promise(function (resolve, reject) {
    fontsStyle();
    resolve();
  });
});

// get all files from dist/fonts and create style in _fonts.sass
// then this will be in style-min.css(need to start gulp)
function fontsStyle() {
  fs.writeFile("src/sass/_fonts.sass", "", cb);
  return fs.readdir("dist/fonts", function (err, items) {
    if (items) {
      let c_fontname, weight;
      for (var i = 0; i < items.length; i++) {
        let fontname = items[i].split(".");
        fontname = fontname[0];
        if (c_fontname != fontname) {
          fontname.toLowerCase().includes("bold")
            ? (weight = 700)
            : (weight = 400);
          fs.appendFile(
            "src/sass/_fonts.sass",
            '@include font("' +
              fontname +
              '", "' +
              fontname +
              '", "' +
              weight +
              '", "normal")\r\n',
            cb
          );
        }
        c_fontname = fontname;
      }
    }
  });
}

function cb() {}

// end fonts
gulp.task("images", function () {
  return gulp
    .src("src/img/*")
    .pipe(
      webp({
        quality: 70,
      })
    )
    .pipe(gulp.dest("dist/img"))
    .pipe(gulp.src("src/img/*"))
    .pipe(
      imagemin({
        progressive: true,
        optimizationLevel: 3,
      })
    )
    .pipe(gulp.dest("dist/img"));
});

gulp.task(
  "default",
  gulp.parallel(
    "watch",
    "server",
    "styles",
    "compress",
    "images",
    "svgSprite",
    "svgSpriteHard",
    "html"
  )
);
