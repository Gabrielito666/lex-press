const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const Jsx = require('../jsx');
const Html = require('../html');
const build = require('../build');

class App
{
    constructor()
    {
        this._expApp = express();
        this._expApp.use(express.json());
        this._expApp.use(cookieParser());
        this._promises_list = [];

        if(process.env.NODE_ENV === "production")
        {
            const views = require(require('path').resolve(__dirname, "views.json")) || [];

            views.forEach(({fileName, route}) =>
            {
                this.html.static(route, fileName);
            })
        }
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
        if(process.env.NODE_ENV !== "production") return new Jsx(this);
    }
    views(dir)
    {
        if(process.env.NODE_ENV !== "production") this._views = new Views(dir, this);
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
            if(process.env.BUILD_MODE)
            {
                build();
            }
        });
    }
}
module.exports = App;