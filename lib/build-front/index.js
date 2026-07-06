const fs = require("fs").promises;
const cheerio = require("cheerio");
const esbuild = require("esbuild");
const path = require("path");
const lexBuildHTML = require("@lek-js/lex/build-html");

/**
 * @import { IPage } from "#lib/routes-map"
 * @import {Plugin, Loader} from "esbuild";
 * @import {BuildHTMLOutput} from "@lek-js/lex/build-html";
 */

/**
 * @type {{ [ext: string]: Loader }}
 */
const loaders = {
	".css": "css",
	".txt": "text",
    	".json": "json",

    // Imágenes
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".gif": "file",
    ".webp": "file",
    ".avif": "file",
    ".svg": "file",
    ".ico": "file",
    ".bmp": "file",
    ".tiff": "file",

    // Vídeos
    ".mp4": "file",
    ".webm": "file",
    ".ogg": "file",
    ".mov": "file",
    ".avi": "file",
    ".mkv": "file",

    // Audio
    ".mp3": "file",
    ".wav": "file",
    ".flac": "file",
    ".aac": "file",
    ".m4a": "file",
    ".oga": "file",

    // Fuentes
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
    ".otf": "file",
    ".eot": "file",
}


/**
 * @param {IPage} pageProps
 * @param {boolean} minify
 * @returns {Promise<BuildHTMLOutput>}
 */
const buildFRONT = (pageProps, minify) =>
{
	if(pageProps.ext === "jsx")
	{
		return buildFRONT.jsx(pageProps.page, pageProps.layout, minify);
	}

	return buildFRONT.html(pageProps.page, minify);
};

/**
 * @param {string} input
 * @param {boolean} minify
 * @returns {Promise<BuildHTMLOutput>}
 */
buildFRONT.html = async(input, minify) =>
{
	const html = await fs.readFile(input, "utf8");

	const $ = cheerio.load(html);

	const scripts = $("script").toArray();
	
	/**@type {string[]}*/
	const bundleFiles = [];
	const virtualModules = new Map();
	const virtualModuleCounter = { current: 0 };

	const promises = scripts.map(async s =>
	{
		//if type="module"
		if(s.attribs.type === "module" && s.attribs.src)
		{
			const scriptPath = path.resolve(path.dirname(input), s.attribs.src);
			bundleFiles.push(scriptPath);
			return;
		}
		if(s.attribs.type === "module" && s.children.length > 0)
		{
			const scriptContent = $(s).html();
			const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
			virtualModules.set(virtualPath, scriptContent);
			bundleFiles.push(virtualPath);
		}
		if(s.attribs.type === "module")
		{
			//skip empty modules
			return;
		}
		
		// if type!=="module"
		if(s.attribs.src)
		{
			const scriptPath = path.join(path.dirname(input), s.attribs.src);
			const scriptContent = await fs.readFile(scriptPath, "utf8");
			const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
			virtualModules.set(virtualPath, scriptContent);
			bundleFiles.push(virtualPath);
		}
		if(s.children.length > 0)
		{
			const scriptContent = $(s).html();
			const virtualPath = `virtual-module-${++virtualModuleCounter.current}.js`;
			virtualModules.set(virtualPath, scriptContent);
			bundleFiles.push(virtualPath);
		}

		//skip empty modules
		return;
	});

	await Promise.all(promises);
	
	// Combine all script contents into a single string
	let combinedContent = '';
	for(const [path, content] of virtualModules.entries())
	{
		combinedContent += content + '\n';
	}
	
	// Add external file contents
	for(const filePath of bundleFiles)
	{
		if(!filePath.startsWith('virtual-module-'))
		{
			const fileContent = await fs.readFile(filePath, 'utf8');
			combinedContent += fileContent + '\n';
		}
	}
	
	// If no content to bundle (only empty scripts), skip bundling
	if(combinedContent.trim() === '')
	{
		$("script").remove();
		
		return {
			htmlText: $.html(),
			assets: [],
			error: null,
			warnings: []
		}
	}
	
	/**@type {Plugin}*/
	const virtualModulePlugin = {
		name: 'virtual-modules',
		setup(build)
		{
			build.onResolve({ filter: /^virtual-main\.js$/ }, args =>
			{
				return {
					path: 'virtual-main.js',
					namespace: 'virtual',
				};
			});

			build.onLoad({ filter: /^virtual-main\.js$/, namespace: 'virtual' }, args =>
			{
				return {
					contents: combinedContent,
					resolveDir: path.dirname(input)
				};
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
		loader: loaders,
		outfile: "html-code-to-build.js",
		assetNames: "./__assets/[name]-[hash]",
	}).catch(err =>
	{
		if(err instanceof Error) return /**@type {Error|import("esbuild").BuildFailure}*/(err);
		return new Error(String(err));
	});

	if(bundle instanceof Error) return { error: bundle, htmlText: null, assets: null };
	$("script").remove();

	/**@type {BuildHTMLOutput["assets"]}*/
	const assets = [];
	// Only add script if there was content to bundle
	if(combinedContent.trim())
	{
		bundle.outputFiles.forEach(f =>
		{
			if(f.path.endsWith(".js"))
			{
				$("head").append($(`<script type="module">${f.text}</script>`));
				return;
			}
			if(f.path.endsWith(".css"))
			{
				$("head").append(`<style>${f.text}</style>`);
				return;
			}
			assets.push(f);
		});
	}

	const htmlString = $.html();

	return { htmlText: htmlString, assets, error: null, warnings: bundle.warnings };
};

/**
 * @param {string} page
 * @param {string|null} layout
 * @param {boolean} minify
 * @returns {Promise<BuildHTMLOutput>}
 */
buildFRONT.jsx = async(page, layout, minify) =>
{
	if(layout) return await lexBuildHTML.layout(layout, page, { minify });
	return await lexBuildHTML.standart(page, { minify });
};

module.exports = buildFRONT;
