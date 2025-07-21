const express = require('express');
const cookieParser = require('cookie-parser');
const setViewsDir = require('../views');
const CONSTS = require('../consts');
const fs = require('fs');
const path = require('path');
const buildHtml = require('../build-html');
const { buildDev, build } = require("lex-builder");

/**
 * @typedef {import('./types').LexpressApp} LexpressApp
 * @typedef {import('./types').LexpressCache} LexpressCache
 * @typedef {import('./types').Lexpress} Lexpress
 */

/**@type {Lexpress} */
const lexpress = () =>
{
    /**@type {LexpressApp} */
    const app = express();

    app.use(express.json());
    app.use(cookieParser());

    app.lexpress = {};
    app.lexpress.cache = {};

    app.public = (path) => app.use(express.static(path));
    app.views = (viewsDir) => setViewsDir(viewsDir, app);
    app.jsx = (route, path, layout) => app.jsx.static(route, path, layout);
    app.html = (route, path) => app.html.static(route, path);

    app.jsx.static = (route, path, layout) =>
    {
        if(process.env.NODE_ENV === "development")
            app.lexpress.cache[route] = { type : "jsx", path, layout, bundle: null }
        ;
    }

    app.jsx.dynamic = (route, path, layout) =>
    {
        console.warn("app.jsx.dynamic is not implemented");
    }


    app.html.static = (route, path) =>
    {
        if(process.env.NODE_ENV === "development")
            app.lexpress.cache[route] = { type : "html", path, bundle: null }
        ;
    }

    app.html.dynamic = (route, path) =>
    {
        console.warn("app.html.dynamic is not implemented");
    }

    
    const oldListen = app.listen;

    app.listen = async(...params) =>
    {   
        if(!fs.existsSync(CONSTS.PATHS.DOT_LEX_PRESS)) fs.mkdirSync(CONSTS.PATHS.DOT_LEX_PRESS);
        if(!fs.existsSync(CONSTS.PATHS.CACHE_JSON)) fs.writeFileSync(CONSTS.PATHS.CACHE_JSON, "{}");
        
        if(process.env.BUILD_MODE && process.env.NODE_ENV === "production")
        {
            throw new Error("BUILD_MODE is not supported in production");
        }

        if(process.env.NODE_ENV === "production" && !process.env.BUILD_MODE)
        {
            app.lexpress.cache = require(CONSTS.PATHS.CACHE_JSON);
        }
        else if(process.env.NODE_ENV === "development" || process.env.BUILD_MODE)
        {
            const promises = Object.entries(app.lexpress.cache).map(async([route, routeData]) =>
            {
                const outputPath = path
                .resolve(CONSTS.PATHS.DOT_LEX_PRESS, route.replaceAll("/", "-$-") + ".html");

                const options = process.env.BUILD_MODE ? { minify: true } : { minify: false };

                if(routeData.type === "html")
                {
                    await buildHtml(routeData.path, outputPath, options);
                }
                else if(routeData.type === "jsx")
                {
                    if(process.env.BUILD_MODE)
                    {
                        await build(routeData.path, routeData.layout, outputPath);
                    }
                    else
                    {
                        await buildDev(routeData.path, routeData.layout, outputPath);
                    }
                }
                routeData.bundle = outputPath;
            });

            await Promise.all(promises);
    
            fs.writeFileSync(CONSTS.PATHS.CACHE_JSON, JSON.stringify(app.lexpress.cache));
        }

        Object.entries(app.lexpress.cache).forEach(([route, routeData]) =>
        {
            if(routeData.bundle)
                app.use(route, express.static(routeData.bundle))
            ;
        });

        if(process.env.BUILD_MODE)
        {
            process.exit(0);
        }
        else
        {
            oldListen.bind(app)(...params);
        }
    }
    
    return app;
}

module.exports = lexpress;