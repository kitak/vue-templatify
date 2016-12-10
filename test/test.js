const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const browserify = require('browserify');
const vueTemplatify = require('../index');
const jsdom = require('jsdom');
const vueCompiler = require('vue-template-compiler');
const transpile = require('vue-template-es2015-compiler');

const tempDir = path.resolve(__dirname, './temp');
const mockEntry = path.resolve(tempDir, 'entry.js');
rimraf.sync(tempDir);
mkdirp.sync(tempDir);

function test (file, assert) {
  it(file, (done) => {
    fs.writeFileSync(mockEntry, 'window.vueModule = require("../fixtures/' + file + '.js")');
    browserify(mockEntry)
      .transform(vueTemplatify)
      .bundle((err, buf) => {
        if (err) return done(err)
        jsdom.env({
          html: '<!DOCTYPE html><html><head></head><body></body></html>',
          src: [buf.toString()],
          done: (err, window) => {
            if (err) return done(err)
            assert(window)
            done()
          }
        })
      });
  });
}

function assertRenderFn (options, template) {
  const compiled = vueCompiler.compile(template);
  expect(options.render.toString()).to.equal(transpile('function render() {' + compiled.render + '}'));
}

describe('vue-templatify', () => {
  test('basic', (window) => {
    const module = window.vueModule;
    assertRenderFn(module, '<h2 class="red">{{msg}}</h2>');
    expect(module.data().msg).to.contain('Hello from Component A!');
  });
});