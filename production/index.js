const express = require('express');
const cookieParser = require('cookie-parser');

const CONSTS = require('../lib/consts');

class App
{
    constructor()
    {
        this._expApp = express();
        this._expApp.use(express.json());
        this._expApp.use(cookieParser());
        this._promises_list = [];

        this._cache = {...require(CONSTS.PATHS.CACHE_JSON)};

        Object.keys(this._cache).forEach(key =>
        {
            this._expApp.use(key, express.static(this._cache[key]));
        })
    }
    //get html()
    //{
        //return new Html(this);
    //}
    get express()
    {
        return express;
    }
    get expressApp()
    {
        return this._expApp;
    }
    get jsx(){}
    views(dir){};
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
        })
    }
}

const lexpress = () =>
{
    const app = new App();
    return app;
}

module.exports = lexpress;