const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const Jsx = require('../jsx');
//const Html = require('../html');
const fsSync = require('fs');
const CONSTS = require('../consts');
const buildServer = require('../build-server');
const path = require('path');

class App
{
    constructor()
    {
        this._expApp = express();
        this._expApp.use(express.json());
        this._expApp.use(cookieParser());
        this._promises_list = [];

        if(fsSync.existsSync(CONSTS.PATHS.DOT_LEX_PRESS)) fsSync.rmSync(CONSTS.PATHS.DOT_LEX_PRESS, { recursive: true });
        fsSync.mkdirSync(CONSTS.PATHS.DOT_LEX_PRESS);
        this._cache = {};
        
    }
    //get html()
    //{
       // return new Html(this);
    //}
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
            if(process.env.BUILD_MODE)
            {
                fsSync.writeFileSync(CONSTS.PATHS.CACHE_JSON, JSON.stringify(this._cache), 'utf-8');
                buildServer(process.env.ENTRY_POINT || path.resolve(CONSTS.PATHS.ROOT), 'index.js')
                .then(() => { console.log("build!") })
                .catch(console.error);
            }
            else
            {
                this._expApp.listen(...args);
            }
        });
    }
}
module.exports = App;