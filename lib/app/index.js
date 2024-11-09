const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const Jsx = require('../jsx');
const Html = require('../html');

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
    get jsx()
    {
        return new Jsx(this);
    }
    views(dir)
    {
        this._views = new Views(dir, this);
    }
    public(path)
    {
        this._expApp.use(express.static(path))
    }
    post(route, ...middelwares)
    {
        return this._expApp.post(route, ...middelwares);
    }
    get(route, ...middelwares)
    {
        return this._expApp.get(route, ...middelwares);
    }
    put(route, ...middelwares)
    {
        return this._expApp.put(route, ...middelwares);
    }
    delete(route, ...middelwares)
    {
        return this._expApp.delete(route, ...middelwares);
    }
    use(route, ...middelwares)
    {
        return this._expApp.use(route, ...middelwares);
    }
    listen(...args)
    {
        Promise.all(this._promises_list).then(() =>
        {
            this._expApp.listen(...args);
        });
    }
}
module.exports = App;