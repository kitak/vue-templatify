var chalk = require('chalk');
var through = require('through');
var vueTemplateCompiler = require('vue-template-compiler');
var transpile = require('vue-template-es2015-compiler');

var genId = require('./lib/gen-id');
var normalize = require('./lib/normalize');

// determine dynamic script paths
var hotReloadAPIPath = normalize.dep('vue-hot-reload-api')

var cache = Object.create(null);

function generateRenderFnCode (compiled) {
  return [
    'var render = ' + toFunction(compiled.render) +';',
    'var staticRenderFns = [' + compiled.staticRenderFns.map(toFunction).join(',') + '];', 
    'var __vue_options = {render: render, staticRenderFns: staticRenderFns};',
  ].join('\n');
}

function generateWithRenderCode (id, templateChanged, enableHotReload) {
  var hotReloadCode = [
    'var hotAPI;',
    'if (module.hot) {(function () {',
    '  hotAPI = require("' + hotReloadAPIPath + '");',
    '  hotAPI.install(require("vue"), true);',
    '  if (!hotAPI.compatible) return;',
    '  module.hot.accept();',
    '  if (module.hot.data) {' +
    (templateChanged ? '    hotAPI.rerender("' + id + '", __vue_options);' : ''),
    '  }' +
    '})()}\n',
  ].join('\n');
  return [
    (enableHotReload ? hotReloadCode : ''),
    'module.exports = function (options) {',
    '  options.render = render;',
    '  options.staticRenderFns = staticRenderFns;',
    (enableHotReload ? [
      '  if (!module.hot.data && typeof hotAPI !== "undefined") {' +
      // initial insert
      '    hotAPI.createRecord("' + id + '", options);' +
      '  }\n'
    ].join('\n') : ''),
    '  return options;',
    '}\n',
  ].join('\n');
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
      output += generateRenderFnCode(compiled);
      templateChanged = (cache[id] && cache[id] !== output);
      cache[id] = output;
      output += generateWithRenderCode(id, templateChanged, (!isProduction && !isTest && !isServer));
      stream.queue(output);
      stream.queue(null);
    }
  }

  return stream;
}

function toFunction (code) {
  return transpile('function render () {' + code + '}');
}
