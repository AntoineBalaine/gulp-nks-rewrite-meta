/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const gulp = require("gulp");
const coffeelint = require("gulp-coffeelint");
const coffee = require("gulp-coffee");
const del = require("del");
const watch = require("gulp-watch");
const beautify = require("js-beautify");
const print = require("gulp-print").default;
const rewrite = require("./index");
var argv = require("minimist")(process.argv.slice(2));
const {
  remapNksf2Vorbis,
  metadataFieldBuilder,
} = require("./lib/metadataHelpers.js");
/* const { exec } = require("child_process");
const { promisify } = require("util"); */
var exec = require("gulp-exec");
spawn = require("child_process").spawn;
const path = require("path");
const fs = require("fs");

// paths, misc settings
const $ = {
  sparkPresetsDir:
    "/Library/Arturia/Spark/Third Party/Native Instruments/presets",
  miniVPresetsDir:
    "/Library/Arturia/Mini V2/Third Party/Native Instruments/presets",
};
/*
gulp.task('coffeelint', () => gulp.src(['./*.coffee', './src/*.coffee'])

  .pipe(coffeelint('./coffeelint.json'))
  .pipe(coffeelint.reporter()));

gulp.task('coffee', ['coffeelint'], () => gulp.src(['./src/*.coffee'])
  .pipe(coffee())
  .pipe(gulp.dest('./lib')));

gulp.task('default', gulp.series('coffee'));

gulp.task('watch', () => gulp.watch('./** /*.coffee', ['default']));

//gulp.task('clean', cb => del(['./lib/*.js', './** /*~'], {force: true}, cb));


// parse spark presets
/* gulp.task('parse-spark-presets', ['default'], function() {
  const rewrite = require('./index');
  return gulp.src([`${$.sparkPresetsDir}/** /*.nksf`])
    .pipe(rewrite(function(file, data) {
      console.info(beautify((JSON.stringify(data)), {indent_size: 2}));
      return undefined;
    })
  );
});

// parse mini V presets
gulp.task('parse-miniv-presets', ['default'], function() {
  const rewrite = require('./index');
  return gulp.src([`${$.miniVPresetsDir}/ ** /*.nksf`])
    .pipe(rewrite(function(file, data) {
      console.info(beautify((JSON.stringify(data)), {indent_size: 2}));
      return undefined;
    })
  );
});
*/

// parse presets folder
gulp.task("parsePresets", function () {
  var folderPath,
    i = process.argv.indexOf("--option");
  if (i > -1) {
    folderPath = process.argv[i + 1];
  }

  return gulp.src(folderPath + "/**/*.nksf").pipe(
    rewrite(function (file, data) {
      let filename = path.basename(file.path);
      let oggfilename = filename + ".ogg";
      let dirname = path.dirname(file.path);

      let oggfile = path.join(dirname, ".previews", oggfilename);
      // find whether oggfile exists

      fs.access(oggfile, fs.constants.F_OK, (err) => {
        if (err) {
          console.error("File does not exist");
        } else {
          console.log("File exists");
        }
      });
      return undefined;
    })
  );
});

// parse presets folder
gulp.task("findUniqueKeys", async function () {
  var folderPath,
    i = process.argv.indexOf("--option");
  if (i > -1) {
    folderPath = process.argv[i + 1];
  }

  let jsonTags = [];

  return gulp
    .src(folderPath + "/*.nksf")
    .pipe(
      rewrite(function (file, data) {
        jsonTags.push(data);
        return undefined;
      })
    )
    .on("data", () => {
      const uniqueKeys = jsonTags
        .map((item) => Object.keys(item))
        .flat()
        .filter((key, index, collection) => collection.indexOf(key) === index);
      console.log(uniqueKeys);
    });
});

gulp.task("findUniqueTypes", async function () {
  var folderPath,
    i = process.argv.indexOf("--option");
  if (i > -1) {
    folderPath = process.argv[i + 1];
  }

  let jsonTypes = [];

  return gulp
    .src(folderPath + "/**/*.nksf")
    .pipe(
      rewrite(function (file, data) {
        jsonTypes.push(data.types.map((type) => type[0]));
        return undefined;
      })
    )
    .on("data", () => {
      const uniqueTypes = jsonTypes
        .flat()
        .filter((key, index, collection) => collection.indexOf(key) === index);
      console.log(uniqueTypes);
    });
});

exports.testRemapNksf2Vorbis = () => {
  const nksfJson = {
    author: "Freelance Soundlabs",
    bankchain: ["Omnisphere", "Factory", "EDM"],
    characters: [
      "Arpeggiated",
      "Synthetic",
      "Monophonic",
      "FM",
      "Analog",
      "Electronic",
      "Wobble",
      "Glide / Pitch Mod",
      "Dark",
    ],
    comment:
      "NKS Created By \nFreelance Soundlabs\n\nhttp://freelancesoundlabs.com\n\nNKS Version 2.5.2\n15-Apr-19",
    deviceType: "INST",
    modes: ["Arpeggiated", "Synthetic", "Monophonic", "Glide/Pitch Mod", "FM"],
    name: "Wobblehead",
    types: [
      ["Genre", "Dubstep"],
      ["Genre", "Electronic"],
      ["Genre", "Hip-Hop"],
      ["Genre", "Quirky"],
      ["Mood", "Angry"],
      ["Mood", "Dark"],
      ["Mood", "Intense"],
      ["Genre", "Bass"],
      ["Mood"],
      ["Arp / Sequence"],
      ["Arp / Sequence", "Bass"],
      ["Arp / Sequence", "Bells & Chimes"],
    ],
    uuid: "6d036e79-a3e8-4466-a57b-f58d8894624a",
    vendor: "Spectrasonics",
  };

  let fileName = "myfile.ogg";
  let shellCommand = "vorbiscomment -a ";
  const vorbisJson /*: NksfUniqueKeys */ = remapNksf2Vorbis(nksfJson);
  Object.keys(vorbisJson).forEach((key) => {
    shellCommand += metadataFieldBuilder(key, vorbisJson[key]);
  });
  shellCommand += fileName;
  console.log(shellCommand);
};

/*
	Full sequence:
	1. read the file's metadata
	2. find matching preview file
	3. remap the nksf to vorbis metadata
	4. write contents to file
*/

exports.transferNKSFMetadataToOgg = (cb) => {
  var folderPath,
    i = process.argv.indexOf("--option");
  if (i > -1) {
    folderPath = process.argv[i + 1];
  }

  return gulp.src(folderPath + "/**/*.nksf").pipe(
    rewrite(async function (file, data) {
      let filename = path.basename(file.path);
      let oggfilename = filename + ".ogg";
      let dirname = path.dirname(file.path);

      let oggfile = path.join(dirname, ".previews", oggfilename);
      // find whether oggfile exists

      fs.access(oggfile, fs.constants.F_OK, (err) => {
        if (err) {
          console.log("unfound");
        } else {
          const vorbisJson /*: NksfUniqueKeys */ = remapNksf2Vorbis(data);
          const metadataFlags = Object.keys(vorbisJson)
            .map((key) => metadataFieldBuilder(key, vorbisJson[key]))
            .flat();

          var cmd = spawn("vorbiscomment", ["-w", ...metadataFlags, oggfile], {
            stdio: "inherit",
          });
        }
      });

      return undefined;
    })
  );
  cb();
};
