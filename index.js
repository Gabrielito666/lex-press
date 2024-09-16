const express = require('express');
const useGetDynamicHtml = require('./useGetDynamicHtml');
const cookieParser = require('cookie-parser');

class App
{
    constructor()
    {
        this._expApp = express();
        this._expApp.use(express.json());
        this._expApp.use(cookieParser());
        this._promises_list = [];
    }
    get html()
    {
        return new Html(this);
    }
    get express()
    {
        return express;
    }
    get expressApp()
    {
        return this._expApp;
    }
    public(path)
    {
        this._expApp.use(express.static(path))
    }
    post(...params)
    {
        return this._expApp.post(...params);
    }
    get(...params)
    {
        return this._expApp.get(...params);
    }
    put(...params)
    {
        return this._expApp.put(...params);
    }
    delete(...params)
    {
        return this._expApp.delete(...params);
    }
    use(...params)
    {
        return this._expApp.use(...params);
    }
    listen(...params)
    {
        Promise.all(this._promises_list).then(() => { this._expApp.listen(...params) });
    }
}
class Html
{
    constructor(app)
    {
        this._app = app;
    }
    static(route, htmlPath)
    {
        this._app._expApp.use(route, express.static(htmlPath));
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

const lexpress = () =>
{
    const app = new App();
    return app;
}

module.exports = lexpress;