var chalk = require('chalk');
var through = require('through');
var vueTemplateCompiler = require('vue-template-compiler');
var transpile = require('vue-template-es2015-compiler');

module.exports = function vueTemplatify (file, options) {
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

    var compiled = vueTemplateCompiler.compile(data);
    var output = '';
    if (compiled.errors.length) {
      compiled.errors.forEach(function (msg) {
        console.error('\n' + chalk.red(msg) + '\n');
      });
      throw new Error('Vue template compilation failed');
    } else {
      output +=  [
        'var render = ' + toFunction(compiled.render) +';',
        'var staticRenderFns = [' + compiled.staticRenderFns.map(toFunction).join(',') + '];', 
        'module.exports = function (options) {',
        '  options.render = render;',
        '  options.staticRenderFns = staticRenderFns;',
        '  return options;',
        '}\n'
      ].join('\n');
      stream.queue(output);
      stream.queue(null);
    }
  }

  return stream;
}

function toFunction (code) {
  return transpile('function render () {' + code + '}');
}
