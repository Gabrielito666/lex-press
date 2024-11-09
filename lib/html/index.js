const useGetDynamicHtml = require('../useGetDynamicHtml');
const scriptsToBundleHtml = require('./modules/scripts-to-bundle-html');
const express = require('express');

class Html
{
    constructor(app)
    {
        this._app = app;
    }
    static(route, htmlPath)
    {
        const promise = scriptsToBundleHtml(htmlPath)
        .then(output =>
        {
            this._app._expApp.use(route, express.static(output));
        });
        
        this._app._promises_list.push(promise);
    }
    dynamic(route, htmlPath, params, onError)
    {
        let resolve, reject;
        const promise = new Promise((rs, rj) => { [resolve, reject] = [rs, rj] });
        this._app._promises_list.push(promise);

        useGetDynamicHtml(htmlPath, params)
        .then(getDynamicHtml =>
        {
            this._app._expApp.get(route, (req, res) =>
            {
                getDynamicHtml(req, res)
                .then(html =>
                {
                    res.status(200).send(html);
                })
                .catch(err =>
                {
                    if(typeof onError === 'function') onError(err, req, res);
                    else res.status(500);
                })
            })
            resolve();
        })
    }
}
module.exports = Html;