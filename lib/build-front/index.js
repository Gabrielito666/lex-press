const fs = require("fs").promises;
const cheerio = require("cheerio");
const esbuild = require("esbuild");
const path = require("path");
const lexBuildHTML = require("@lek-js/lex/build-html");

/**
* @typedef {import("./types").BuildFRONT} BuildFRONT
*/

/**@type {BuildFRONT} */
const buildFRONT = (routeDef, minify) =>
{
    if(routeDef.ext === "html")
    {
        return buildFRONT.html(routeDef.page, minify);
    }
    else if(routeDef.ext === "jsx")
    {
        return buildFRONT.jsx(routeDef.page, routeDef.layout, minify);
    }
};

buildFRONT.html = async(input, minify) =>
{
    const html = await fs.readFile(input, "utf8");

    const $ = cheerio.load(html);

    const scripts = $("script").toArray();

    const bundleFiles = [];
    const virtualModules = new Map();
    const virtualModuleCounter = { current: 0 };

    const promises = scripts.map(async s =>
    {
        if(s.attribs.type === "module")
        {
            if(s.attribs.src)
            {
                const scriptPath = path.resolve(path.dirname(input), s.attribs.src);
                bundleFiles.push(scriptPath);
            }
            else if(s.children.length > 0)
            {
                const scriptContent = s.children[0].data;
                const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
                virtualModules.set(virtualPath, scriptContent);
                bundleFiles.push(virtualPath);
            }
            else
            {
                // Skip empty scripts instead of throwing error
            }
        }
        else
        {
            if(s.attribs.src)
            {
                const scriptPath = path.join(path.dirname(input), s.attribs.src);
                const scriptContent = await fs.readFile(scriptPath, "utf8");
                const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
                virtualModules.set(virtualPath, scriptContent);
                bundleFiles.push(virtualPath);
            }
            else if(s.children.length > 0)
            {
                const scriptContent = s.children[0].data;
                const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
                virtualModules.set(virtualPath, scriptContent);
                bundleFiles.push(virtualPath);
            }
            else
            {
                // Skip empty scripts instead of throwing error
            }
        }
    });

    await Promise.all(promises);
    
    // Combine all script contents into a single string
    let combinedContent = '';
    for (const [path, content] of virtualModules.entries()) {
        combinedContent += content + '\n';
    }
    
    // Add external file contents
    for (const filePath of bundleFiles) {
        if (!filePath.startsWith('virtual-module-')) {
            const fileContent = await fs.readFile(filePath, 'utf8');
            combinedContent += fileContent + '\n';
        }
    }
    
    // If no content to bundle (only empty scripts), skip bundling
    if (combinedContent.trim() === '') {
        $("script").remove();
        
        return $.html();
    }

    const virtualModulePlugin = {
        name: 'virtual-modules',
        setup(build) {
            build.onResolve({ filter: /^virtual-main\.js$/ }, args => {
                return { path: 'virtual-main.js', namespace: 'virtual' };
            });

            build.onLoad({ filter: /^virtual-main\.js$/, namespace: 'virtual' }, args => {
                return { contents: combinedContent };
            });
        },
    };
    
    const bundle = await esbuild.build({
        entryPoints: ['virtual-main.js'],
        bundle: true,
        minify: minify,
        write: false,
        format: "esm",
        target: "esnext",
        platform: "browser",
        plugins: [virtualModulePlugin],
    }).catch(e =>
    {
        console.error(e);
        throw e;
    });
    $("script").remove();

    // Only add script if there was content to bundle
    if (combinedContent.trim()) {
        bundle.outputFiles.forEach(f =>
        {
            const script = $(`<script type="module">${f.text}</script>`);
            $("head").append(script);
        });
    }

    const htmlString = $.html();

    return htmlString;
}

buildFRONT.jsx = async(page, layout, minify) =>
{
    if(layout)
    {
        return await lexBuildHTML.layout(layout, page, { minify, write: false });
    }
    else
    {
        return await lexBuildHTML.standart(page, { minify, write: false });
    }
}

module.exports = buildFRONT;