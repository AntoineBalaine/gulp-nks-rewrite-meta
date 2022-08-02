## gulp-nks-rewrite-meta

Gulp plugin for rewriting metadata of NKSF(Native Kontrol Standard) preset file.
Also serves to copy NKSF metadata to corresponding ogg previews.

## Installation

`npm install`

Requires `vorbis-tools` to work:
macos: `brew install vorbis-tools`
ubuntu: `sudo apt install vorbis-tools`
arch: `pacman -Sy vorbis-tools`

if this doesn't work right away, try to install gulp globally:
`npm install -g gulp`

## Usage

### copying NKSF metadata to corresponding OGG files
From the CLI, in project's directory:
`gulp transferNKSFMetadataToOgg --option <NKSFfolderName>`
Expects a folder structure similar to [ testFiles ](./testFiles/):
```
NKSFfolder/
├── .previews
│   ├── preset1.nksf.ogg
│   ├── preset2.nksf.ogg
├── preset1.nksf
├── preset2.nksf
```


### rewriting NKSF metadata
using some static data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ['src/Piano/**/*.nksf']
    .pipe rewrite
      modes: ['Sample-based']
      types: [
        ['Piano/Keys']
        ['Piano/Keys', 'Electric Piano']
      ]
    .pipe gulp.dest 'dist'
```

using a function to provide data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ['src/Velvet/**/*.nksf'], read: true
    .pipe rewrite (file, metadata) ->
      folder = path.relative 'src/Velvet', path.dirname file.path
      # using folder as preset bank
      bankchain: ['Velvet', folder, '']
    .pipe gulp.dest 'dist'
```

using the non-blocking function to provide data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ['src/**/*.nksf'], read: true
  .pipe rewrite (file, metadata, done) ->
    # create data in non-blocking
    nonblockingfunction metadata, (err, data) ->
      done err, data
  .pipe gulp.dest 'dist'
```

## API

### rewrite(data)

#### data
Type: `Object` or `function(file, metadata [,callback])`

The data or data provider to rewrite for.

##### data.author [optional]
Type: `String`

##### data.bankchain [optional]
Type: `Array` of `String`

The length of array should be 3.

##### data.comment [optional]
Type: `String`

##### data.modes [optional]
Type: `Array` of `String`

##### data.name [optional]
Type: `String`

##### data.types [optional]
Type: 2 dimensional `Array` of `String`

The length of inner array should be 1 or 2

examle:
  [
    ['Piano/Keys'],
    ['Piano/Keys', 'Electric Piano']
  ]

#### function (file, metadata [,callbak])
The functoin to provide data.

##### file
Type: instance of `vinyl` file

##### metadata
Type: `Object`

The metadata of source file.

##### callback
Type: `function(err, data)`

The callback function to support non-blocking data provider.

example metadata of .nksf
```javascript
{
  "UUID": "7E256217-47DA-4746-0001-A4656EF12290",
  "author": "C.Pitman",
  "bankchain": ["Mini V2", "", ""],
  "comment": "",
  "deviceType": "INST",
  "modes": ["Long Release", "Synthetic"],
  "name": "poly5",
  "types": [
    ["Synth Pad", "Basic Pad"],
    ["Synth Pad", "Bright Pad"]
  ],
  "uuid": "",
  "vendor": "Arturia"
}
```

```javascript
{
  "author": "",
  "bankchain": ["Velvet", "MKII", ""],
  "comment": "",
  "deviceType": "INST",
  "modes": ["Sample-based"],
  "name": "69 MKII Spooky Ring Mod",
  "types": [
    ["Piano/Keys"],
    ["Piano/Keys", "Electric Piano"]
  ],
  "uuid": "b9d0a3da-3603-45b9-b5e9-99207f131991",
  "vendor": "AIR Music Technology"
}
```
