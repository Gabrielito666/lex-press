const App = require('./lib/app');
const lexpress = () =>
{
    const app = new App();
    return app;
}

module.exports = lexpress;