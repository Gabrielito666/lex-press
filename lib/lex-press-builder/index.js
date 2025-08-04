const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('../views');
const buildFRONT = require('../build-front');
const routesHandler = require('../routes-handler');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

/**
 * @typedef {import('./types.d.ts').ToBuildedObjectStack} ToBuildedObjectStack
 * 
 * @typedef {import('../lex-press-dev/types.d.ts').LexpressDev} LexPressDev
 * @typedef {import('../lex-press-dev/types.d.ts').LexpressDevApp} LexPressDevApp
*/


const libProductionTemplatePaht = path.resolve(__dirname, "../lex-press-production/index.js");
const libProductionTemplate = fs.readFileSync(libProductionTemplatePaht, "utf-8");

/**
 * @type {LexPressDev}
*/
const lexpress = () =>
{
    /**@type {LexPressDevApp} */
    const app = express();

    /**@type {ToBuildedObjectStack} */
    const toBuildedObjectStack = {};

    const routes = routesHandler();

    app.use(express.json());
    app.use(cookieParser());

    app.public = (path) => app.use(express.static(path));
    app.views = (viewsDir) =>
    {
        const dir = new Views(viewsDir, null);

        dir.forEachFile(page =>
        {
            toBuildedObjectStack[page.route] = {
                html: null,
                serverPropsModule: null
            };
            if(page.serverPropsModule)
            {
                toBuildedObjectStack[page.route].serverPropsModule = page.serverPropsModule;
            }

            if(page.ext === "jsx")
            {
                routes.setRoute(page.route, {
                    ext : "jsx",
                    page: page.file,
                    layout: page.layout,
                    serverProps: null
                });
            }
            else if(page.ext === "html")
            {
                routes.setRoute(page.route, {
                    ext : "html",
                    page: page.file,
                    layout: null,
                    serverProps: null
                });
            }
        });
    };
    
    app.html = (route, page) => {
        toBuildedObjectStack[route] = {
            html: null,
            serverPropsModule: null
        };
        routes.setRoute(route, {
            ext : "html",
            page,
            layout: null,
            serverProps: null
        });

        return {
            serverProps : (serverPropsFunc) =>
            {
                /**In build process, the iniline functions are ignored */
            }
        }
    };


    app.jsx = (route, page, layout) =>
    {
        toBuildedObjectStack[route] = {
            html: null,
            serverPropsModule: null
        };
        routes.setRoute(route, {
            ext : "jsx",
            page,
            layout,
            serverProps: null
        });

        return {
            serverProps : (serverPropsFunc) =>
            {
                /**In build process, the iniline functions are ignored */
            }
        }
    }

    app.listen = async(...params) =>
    {   
        const serverPromises = routes.mapRoutes(async(route, routeDef) =>
        {
            const html = await buildFRONT(routeDef, true);

            toBuildedObjectStack[route].html = html;
        });

        await Promise.all(serverPromises);

        const buildedRoutesList = Object.entries(toBuildedObjectStack).map(([route, { html, serverPropsModule }]) => {
            return `"${route}": {
                htmlBase64 : "${Buffer.from(html).toString("base64") || "null"}",
                serverProps : ${ serverPropsModule ? `require("${serverPropsModule}")` : "null" }
            }`
        }).join(",\n");
        
        const buildedRoutes = `const BUILDED_ROUTES = {
            ${buildedRoutesList}
        }`;
        const libProduction = libProductionTemplate.replace(
            "const BUILDED_ROUTES = {/*FROM BUILD*/};",
            buildedRoutes
        );

        const entryPoint = path.resolve(process.cwd(), process.argv[1]);

        // Plugin para interceptar "lex-press"
        const virtualLexPressPlugin = {
            name: "virtual-lex-press",
            setup(build) {
            // Intercepta cualquier import/require de "lex-press"
            build.onResolve({ filter: /^lex-press$/ }, args => ({
                path: args.path,
                namespace: "virtual-lexpress"
            }));
        
            // Devuelve el contenido reemplazado como módulo virtual
            build.onLoad({ filter: /.*/, namespace: "virtual-lexpress" }, () => ({
                contents: libProduction,
                loader: "js",
                resolveDir: path.resolve(process.cwd(), "node_modules/lex-press/lib/lex-press-production/")
            }));
            }
        };

        const args = process.argv.slice(2);

        const externalIndex = args.indexOf("--external");
        let external = [];
        
        if (externalIndex !== -1) {
            for (let i = externalIndex + 1; i < args.length; i++)
            {
                if (args[i].startsWith("--")) break;
                external.push(args[i]);
            }
        }
        
        await esbuild.build({
            entryPoints: [entryPoint],
            outfile: path.resolve(process.cwd(), ".lexpress-server.js"),
            bundle: true,
            platform: "node",
            target: "node18",
            plugins: [virtualLexPressPlugin],
            external: external
        });

        console.log("Builded server file created at .lexpress-server.js");

        if(fs.readFileSync(path.resolve(process.cwd(), ".lexpress-server.js"), "utf-8").includes("__dirname"))
        {
            console.warn("The server file contains __dirname, this is not supported by the production server. Please use process.cwd() instead.");
        }

        process.exit(0);
    }
    
    return app;
}

module.exports = lexpress;