/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const assert       = require('assert');
const through      = require('through2');
const gutil        = require('gulp-util');
const _            = require('underscore');
const reader       = require('riff-reader');
const msgpack      = require('msgpack-lite');
const riffBuilder  = require('./riff-builder');

const PLUGIN_NAME = 'bitwig-rewrite-meta';

// chunk id
const $ = {
 chunkId: 'NISI',
 chunkVer: 1,
 formType: 'NIKS',
 metaItems: [
  'author',
  'bankchain',
  'comment',
  'modes',      // optional, default: not contained.
  'name',
  'types'      // optional. default: not contained.
 ]
};

module.exports = data => through.obj(function(file, enc, cb) {
  let error;
  let rewrited = false;
  const rewrite = (err, obj) => {
    if (rewrited) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'duplicate callback'));
      return;
    }
    rewrited = true;
    if (err) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
      return cb();
    }
    try {
      const chunk =  _createChunk(file, obj);
      _replaceChunk(file, chunk);
      this.push(file);
    } catch (error) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
    }
    return cb();
  };

  if (!file) {
    rewrite('Files can not be empty');
    return;
  }

  if (file.isStream()) {
    rewrite('Streaming not supported');
    return;
  }
    
  if (_.isFunction(data)) {
    let obj;
    try {
      const metadata = _deserializeChunk(file);
      obj = data.call(this, file, metadata, rewrite);
    } catch (error1) {
      error = error1;
      rewrite(error);
    }
    if (data.length <= 2) {
      return rewrite(undefined, obj);
    }
  } else {
    try {
      _deserializeChunk(file);
    } catch (error2) {
      error = error2;
      return error;
    }
    return rewrite(undefined, data);
  }
});

//
// deserialize NISI chunk
var _deserializeChunk = function(file) {
  const src = file.isBuffer() ? file.contents : file.path;
  let json = undefined;
  reader(src, $.formType).readSync(function(id, data) {
    assert.ok((id === $.chunkId), `Unexpected chunk id. id:${id}`);
    assert.ok((_.isUndefined(json)), "Duplicate metadata chunk.");
    const ver = data.readUInt32LE(0);
    assert.ok(ver === $.chunkVer, `Unsupported format version. version:${ver}`);
    return json = msgpack.decode(data.slice(4));
  }
  , [$.chunkId]);

  assert.ok(json, `${$.chunkId} chunk is not contained in file.`);
  // set original metadata
  file.data = json;
  return json;
};

//
// create new NISI chunk
var _createChunk = function(file, obj) {
  obj = _validate(obj);
  const originalKeys = _.keys(file.data);
  const rewriteKeys  = _.keys(obj);

  // optionnal items
  const shouldInsertModes = !(Array.from(originalKeys).includes('modes')) && Array.from(rewriteKeys).includes('modes');
  const shouldInsertTypes = !(Array.from(originalKeys).includes('types')) && Array.from(rewriteKeys).includes('types');

  // create new NISI chunk
  const meta = {};
  for (let key in file.data) {
    // insert 'modes' pre 'name'
    const value = file.data[key];
    if (shouldInsertModes && (key === 'name')) {
      chunk.pushKeyValue('modes', obj.modes);
      meta.modes = obj.modes;
    }

    // replace metadata
    if (Array.from(rewriteKeys).includes(key)) {
      meta[key] = obj[key];
    } else {
      meta[key] = value;
    }

    // insert 'types' post 'name'
    if (shouldInsertTypes && (key === 'name')) {
      chunk.pushKeyValue('types', obj.types);
      meta.types = obj.types;
    }
  }

  // set metadata to output file
  file.data = meta;

  // chunk format version
  const buffer = new Buffer(4);
  buffer.writeUInt32LE($.chunkVer);
  // seriaize metadata to buffer
  return Buffer.concat([buffer, msgpack.encode(meta)]);
};

//
// replace NISI chunk
var _replaceChunk = function(file, chunk) {
  // riff buffer builder
  const riff = riffBuilder($.formType);

  // iterate chunks
  const src = file.isBuffer() ? file.contents : file.path;
  reader(src, $.formType).readSync(function(id, data) {
    if (id === $.chunkId) {
      return riff.pushChunk(id, chunk);
    } else {
      return riff.pushChunk(id, data);
    }
  });

  // output file
  return file.contents = riff.buffer();
};

// validate object
var _validate = function(obj) {
  obj = obj || {};
  for (let key in obj) {
    const value = obj[key];
    switch (key) {
      case 'author':case 'comment': case 'name':
        _assertString(key, value);
        break;
      case 'bankchain':
        _assertArray(key, value, 3);
        break;
      case 'modes':
        _assertArray(key, value);
        break;
      case 'types':
        _assertTypes(key, value);
        break;
      default:
        assert.ok(false, `Unsupported option ${key}.`);
    }
  }
  return obj;
};

// assert string property
var _assertString = (key, value) => assert.ok((_.isString(value)), `Option ${key} must be string. ${key}:${value}`);

// assert array property
var _assertArray = function(key, value, size) {
  assert.ok((_.isArray(value)), `Option ${key} value must be array or string. ${key}:${value}`);
  if (_.isNumber(size)) {
    assert.ok((value.length === size), `Option ${key} length of array must be ${size}. ${key}:${value}`);
  }
  return Array.from(value).map((s) =>
    assert.ok((_.isString(s)), `Option ${key} value must be array of string. ${key}:${value}`));
};

// assert 'types' property
var _assertTypes = function(key, value) {
  assert.ok((_.isArray(value)), `Option ${key} value must be 2 dimensional array or string. ${key}:${value}`);
  return (() => {
    const result = [];
    for (let ar of Array.from(value)) {
      assert.ok((_.isArray(ar)), `Option ${key} value must be 2 dimensional array of string. ${key}:${value}`);
      assert.ok(((ar.length === 1) || (ar.length === 2)), `Option ${key} length of inner array must be 1 or 2. ${key}:${value}`);
      result.push(Array.from(ar).map((s) =>
        assert.ok((_.isString(s)), `Option ${key} value must be 2 dimensional array of string. ${key}:${value}`)));
    }
    return result;
  })();
};
