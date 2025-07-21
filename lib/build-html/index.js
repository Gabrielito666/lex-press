const fs = require("fs").promises;
const cheerio = require("cheerio");
const esbuild = require("esbuild");
const path = require("path");
const CONSTS = require("../consts");

/**
 * @typedef {import("./types").BuildHtmlFunction} BuildHtmlFunction
 */

/**@type {BuildHtmlFunction} */
const buildHtml = async(input, output, options) =>
{
    options.mode = options.mode || "inline";
    options.minify = options.minify === undefined ? true : options.minify;

    if(options.mode === "inline")
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
                    throw new Error("Script must have src or textContent");
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
                    throw new Error("Script must have src or textContent");
                }
            }
        });

        await Promise.all(promises);

        const virtualModulePlugin = {
            name: 'virtual-modules',
            setup(build) {
                build.onResolve({ filter: /^virtual-module-.*\.js$/ }, args => {
                    return { path: args.path, namespace: 'virtual' };
                });

                build.onLoad({ filter: /^virtual-module-.*\.js$/, namespace: 'virtual' }, args => {
                    const content = virtualModules.get(args.path);
                    if (content) {
                        return { contents: content };
                    }
                    return { contents: '' };
                });
            },
        };

        const bundle = await esbuild.build({
            entryPoints: [...new Set(bundleFiles)],
            bundle: true,
            minify: options.minify,
            write: false,
            format: "esm",
            target: "esnext",
            platform: "browser",
            plugins: [virtualModulePlugin],
        });

        $("script").remove();

        bundle.outputFiles.forEach(f =>
        {
            const script = $(`<script type="module">${f.text}</script>`);
            $("head").append(script);
        });

        const htmlString = $.html();
        
        await fs.writeFile(output, htmlString);

        return output;
    }
    else
    {
        throw new Error("Unsupported mode: " + options.mode);
    }
}

module.exports = buildHtml;