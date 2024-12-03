const { jsxToStaticHtml } = require('./modules/jsx-to-static-html');
const express = require('express');

class Jsx
{
    constructor(app)
    {
        this._app = app;
    }
    static(route, jsxPath, layout)
    {
        const promise = new Promise((resolve, reject) =>
        {

            if(!this._app._cache[route])
            {
                jsxToStaticHtml(jsxPath, layout)
                .then(html =>
                {
                    this._app._expApp.use(route, express.static(html));
                    this._app._cache[route] = html;
                    resolve();
                })
                .catch(reject)
            }
            else
            {
                this._app._expApp.use(route, express.static(this._app._cache[route]));
                resolve();
            }
        });
        this._app._promises_list.push(promise);
    }
}
module.exports = Jsx;