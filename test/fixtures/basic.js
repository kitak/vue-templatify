var withRender = require('./basic.html');

module.exports = withRender({
  data: function () {
    return {
      msg: 'Hello from Component A!'
    };
  }
});