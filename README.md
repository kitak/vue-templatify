# vue-templatify

Browserify transform for Vue.js 2.0 template

This transform is just pre-compile a template by using [vue-templatify](https://www.npmjs.com/package/vue-templatify) and provide a function that can inject render function to a component options object.  

Usually, you had better to use [vueify](https://github.com/vuejs/vueify).

## Usage

```bash
npm install vue-templatify --save-dev
browserify -t vue-templatify -e src/main.js -o dist/build.js
```

## Example code

Write a template of Vue component as html.

```html
<!-- app.html -->
<div class="app">
  <p>{{ text }}</p>
  <button type="button" @click="log">Log</button>
</div>
```

Import it as a function and pass a component option to the function.

```js
// app.js
import withRender from './app.html'

export default withRender({
  data () {
    return {
      text: 'Example text'
    }
  },

  methods: {
    log () {
      console.log('output log')
    }
  }
})
```

## License

[MIT](http://kitak.mit-license.org/)
