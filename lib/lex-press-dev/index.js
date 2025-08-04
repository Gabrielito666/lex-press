const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const buildFRONT = require('../build-front');
const serverPropsHTML = require('../server-props-html');
const routesHandler = require('../routes-handler');

/**
 * @typedef {import('./types.d.ts').LexpressDevApp} LexpressDevApp
 * @typedef {import('./types.d.ts').LexpressDev} LexpressDev
 */

/**@type {LexpressDev} */
const lexpress = () =>
{
    /**@type {LexpressDevApp} */
    const app = express();

    const routes = routesHandler();

    app.use(express.json());
    app.use(cookieParser());

    app.public = (path) => app.use(express.static(path));
    app.views = (viewsDir) => 
    {
        const dir = new Views(viewsDir, null);
        dir.forEachFile(page =>
        {
            if(page.ext === "jsx")
            {
                if(!page.layout) throw new Error(`Layout not found for ${page.file}`);

                const jsx = app.jsx(page.route, page.file, page.layout);
                if(page.serverPropsModule)
                {
                    const serverPropsFunc = require(page.serverPropsModule).default || require(page.serverPropsModule);
                    jsx.serverProps(serverPropsFunc);
                }
            }
            else if(page.ext === "html")
            {
                const html = app.html(page.route, page.file);
                if(page.serverPropsModule)
                {
                    const serverPropsFunc = require(page.serverPropsModule).default || require(page.serverPropsModule);
                    html.serverProps(serverPropsFunc);
                }
            }
        });
    }
    
    app.html = (route, page) => {
        routes.setRoute(route, {
            ext : "html",
            page,
            layout: null,
            serverProps: null
        });

        return {
            serverProps : (serverPropsFunc) =>
            {
                routes.getRoute(route).set("serverProps", serverPropsFunc);
            }
        }
    };


    app.jsx = (route, page, layout) =>
    {
        routes.setRoute(route, {
            ext : "jsx",
            page,
            layout,
            serverProps: null
        });

        return {
            serverProps : (serverPropsFunc) =>
            {
                routes.getRoute(route).set("serverProps", serverPropsFunc);
            }
        }
    }

    const oldListen = app.listen;

    app.listen = async(...params) =>
    {   
        const serverPromises = routes.mapRoutes(async(route, routeDef) =>
        {
            const html = await buildFRONT(routeDef, false);

            if(routeDef.serverProps)
            {
                app.get(route, async(req, res) =>
                { 
                    const dynamicHtml = await serverPropsHTML(html, routeDef.serverProps, req);
                    res.send(dynamicHtml);
                });
            }
            else
            {
                app.get(route, (req, res) =>
                {
                    res.send(html);
                });
            }
        });

        await Promise.all(serverPromises);
        oldListen.bind(app)(...params);
    }
    
    return app;
}

module.exports = lexpress;