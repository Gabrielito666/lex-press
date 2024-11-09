const jsxToStaticHtml = require('./modules/jsx-to-static-html');
const express = require('express');

class Jsx
{
    constructor(app)
    {
        this._app = app;
    }
    static(route, jsxPath)
    {
        let resolve, reject;
        const promise = new Promise(async(rs, rj) => { [ resolve, reject ] = [ rs, rj ] });

        jsxToStaticHtml(jsxPath, this._app._dev_mode)
        .then(html =>
        {
            this._app._expApp.use(route, express.static(html));
            resolve();
        })
        .catch(reject)

        this._app._promises_list.push(promise);
    }
}
module.exports = Jsx;