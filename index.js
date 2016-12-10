var chalk = require('chalk');
var through = require('through');
var vueTemplateCompiler = require('vue-template-compiler');
var transpile = require('vue-template-es2015-compiler');

var genId = require('./lib/gen-id');
var normalize = require('./lib/normalize');

// determine dynamic script paths
var hotReloadAPIPath = normalize.dep('vue-hot-reload-api')

var cache = Object.create(null);

function generateRenderCode (compiled) {
  return [
    'var render = ' + toFunction(compiled.render) +';',
    'var staticRenderFns = [' + compiled.staticRenderFns.map(toFunction).join(',') + '];', 
    'var __vue__options__ = {render: render, staticRenderFns: staticRenderFns};',
    'module.exports = function (options) {',
    '  options.render = render;',
    '  options.staticRenderFns = staticRenderFns;',
    '  return options;',
    '}\n'
  ].join('\n');
}

function generateHotReloadCode (id, templateChanged) {
  'if (module.hot) {(function () {' +
  '  var hotAPI = require("' + hotReloadAPIPath + '")\n' +
  '  hotAPI.install(require("vue"), true)\n' +
  '  if (!hotAPI.compatible) return\n' +
  '  module.hot.accept()\n' +
  '  if (!module.hot.data) {\n' +
  // initial insert
  '    hotAPI.createRecord("' + id + '", __vue__options__)\n' +
  '  } else {\n' +
  (templateChanged
      ? '    hotAPI.rerender("' + id + '", __vue__options__)\n'
      : '') +
  '  }\n' +
  '})()}';
}

module.exports = function vueTemplatify (file, options) {
  var isProduction = process.env.NODE_ENV === 'production';
  var isServer = process.env.VUE_ENV === 'server';
  var isTest = !!process.env.VUE_TEMPLATIFY_TEST;

  if (!/.html$/.test(file)) {
    return through();
  }

  var data = '';
  var stream = through(write, end);
  stream.vueTemplatify = true;

  function write (buf) {
    data += buf;
  }

  function end () {
    stream.emit('file', file)

    var id = genId(file);
    var compiled = vueTemplateCompiler.compile(data);
    var output = '';
    var templateChanged;
    if (compiled.errors.length) {
      compiled.errors.forEach(function (msg) {
        console.error('\n' + chalk.red(msg) + '\n');
      });
      throw new Error('Vue template compilation failed');
    } else {
      output += generateRenderCode(compiled);
      templateChanged = cache[id] !== output;
      cache[id] = output;

      if (!isProduction && !isTest && !isServer) {
        output += generateHotReloadCode(id, templateChanged);
      }
      stream.queue(output);
      stream.queue(null);
    }
  }

  return stream;
}

function toFunction (code) {
  return transpile('function render () {' + code + '}');
}
