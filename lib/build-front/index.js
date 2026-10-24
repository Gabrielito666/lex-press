const fs = require("fs").promises;
const cheerio = require("cheerio");
const esbuild = require("esbuild");
const path = require("path");
const lexBuildHTML = require("@lek-js/lex/build-html");
const { STATIC_PROPS_ID, STATIC_PROPS_GLOBAL } = require("#lib/static-props");

/**
 * @import { IPage } from "#lib/routes-map"
 * @import {Plugin, Loader} from "esbuild";
 * @import {BuildHTMLOutput} from "@lek-js/lex/build-html";
 * @import { StaticProps } from "#lib/lex-press-dev";
 */

/**
 * Tells whether a script src is an absolute external URL (http/https). Those
 * scripts are never read from disk nor bundled: they stay untouched in the html.
 * @param {string} src
 * @returns {boolean}
 */
const isExternalSrc = (src) => /^https?:\/\//i.test(src);

/**
 * Removes scripts without src or with a local src, leaving external (http/https)
 * ones untouched. It is not `$("script").remove()`: CDN scripts must survive
 * bundling.
 * @param {ReturnType<typeof cheerio.load>} $
 * @returns {void}
 */
const removeLocalScripts = ($) =>
{
	$("script").each((_, s) =>
	{
		if(!isExternalSrc(s.attribs.src ?? ""))
		{
			$(s).remove();
		}
	});
};

/**
 * Turns staticProps into the single JSON payload used by both sinks: the
 * <script type="application/json"> tag and the JS literal inside Lex's
 * stringCode. The replacer rejects function and symbol because JSON.stringify
 * would drop them silently. The replacements below use sequences that are valid
 * escapes in JSON and in JS at the same time, and escaping "</script" stops the
 * payload from closing the inline bundle where the code ends up.
 * @param {StaticProps} props
 * @returns {string}
 */
const serializeStaticProps = (props) =>
{
	const json = JSON.stringify(props, (_, value) =>
	{
		if(typeof value === "function" || typeof value === "symbol")
		{
			throw new TypeError(`[LEX-PRESS STATIC PROPS ERROR]: staticProps only accepts JSON-serializable values, but found a ${typeof value}.`);
		}
		return value;
	});

	if(json === undefined)
	{
		throw new TypeError("[LEX-PRESS STATIC PROPS ERROR]: staticProps is not JSON-serializable.");
	}

	return json
		.replace(/<\/(script)/gi, "<\\/$1")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
};

/**
 * Injects the staticProps payload as the first script of the head. Must be
 * called AFTER removeLocalScripts (or any other script cleanup): the payload has
 * no src, so that cleanup would remove it.
 * @param {ReturnType<typeof cheerio.load>} $
 * @param {string} escapedJson
 * @returns {void}
 */
const injectStaticProps = ($, escapedJson) =>
{
	$("head").prepend(`<script id="${STATIC_PROPS_ID}" type="application/json">${escapedJson}</script>`);
};

/**
 * @type {{ [ext: string]: Loader }}
 */
const loaders = {
	".css": "css",
	".txt": "text",
    	".json": "json",

    // Images
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

    // Videos
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

    // Fonts
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
	// The arity is preserved when there are no staticProps: unit tests deepEqual
	// the delegation arguments.
	if(pageProps.ext === "jsx")
	{
		if(pageProps.staticProps === undefined)
		{
			return buildFRONT.jsx(pageProps.page, pageProps.layout, minify);
		}
		return buildFRONT.jsx(pageProps.page, pageProps.layout, minify, pageProps.staticProps);
	}

	if(pageProps.staticProps === undefined)
	{
		return buildFRONT.html(pageProps.page, minify);
	}

	return buildFRONT.html(pageProps.page, minify, pageProps.staticProps);
};

/**
 * @param {string} input
 * @param {boolean} minify
 * @param {StaticProps} [staticProps]
 * @returns {Promise<BuildHTMLOutput>}
 */
buildFRONT.html = async(input, minify, staticProps) =>
{
	const escapedProps = staticProps === undefined ? null : serializeStaticProps(staticProps);
	const html = await fs.readFile(input, "utf8");

	const $ = cheerio.load(html);

	const scripts = $("script").toArray();
	
	/**@type {string[]}*/
	const bundleFiles = [];
	const virtualModules = new Map();
	const virtualModuleCounter = { current: 0 };

	const promises = scripts.map(async s =>
	{
		if(s.attribs.type === "module" && s.attribs.src)
		{
			if(isExternalSrc(s.attribs.src))
			{
				return;
			}
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
			// empty module scripts are skipped
			return;
		}
		
		if(s.attribs.src)
		{
			if(isExternalSrc(s.attribs.src))
			{
				return;
			}
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

		return;
	});

	await Promise.all(promises);
	
	let combinedContent = '';
	for(const [path, content] of virtualModules.entries())
	{
		combinedContent += content + '\n';
	}
	
	for(const filePath of bundleFiles)
	{
		if(!filePath.startsWith('virtual-module-'))
		{
			const fileContent = await fs.readFile(filePath, 'utf8');
			combinedContent += fileContent + '\n';
		}
	}
	
	if(combinedContent.trim() === '')
	{
		removeLocalScripts($);

		if(escapedProps !== null)
		{
			injectStaticProps($, escapedProps);
		}

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
		treeShaking: true,
		plugins: [virtualModulePlugin],
		loader: loaders,
		outfile: "html-code-to-build.js",
		publicPath: "/",
		assetNames: "/__assets/[name]-[hash]",
	}).catch(err =>
	{
		if(err instanceof Error) return /**@type {Error|import("esbuild").BuildFailure}*/(err);
		return new Error(String(err));
	});

	if(bundle instanceof Error) return { error: bundle, htmlText: null, assets: null };
	removeLocalScripts($);

	// After removeLocalScripts (the payload has no src) and before appending the
	// bundle, so the payload stays the first script of the head.
	if(escapedProps !== null)
	{
		injectStaticProps($, escapedProps);
	}

	/**@type {BuildHTMLOutput["assets"]}*/
	const assets = [];
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
 * @param {StaticProps} [staticProps]
 * @returns {Promise<BuildHTMLOutput>}
 */
buildFRONT.jsx = async(page, layout, minify, staticProps) =>
{
	if(staticProps === undefined)
	{
		if(layout) return await lexBuildHTML.layout(layout, page, { minify });
		return await lexBuildHTML.standart(page, { minify });
	}

	// Lex SSR evaluates the bundle in an empty JSDOM where the payload script
	// does not exist yet, so props travel in a global. The assignment is the
	// first statement: imports get hoisted, but it still runs before Lex.mount.
	const escaped = serializeStaticProps(staticProps);
	const globalLine = `globalThis.${STATIC_PROPS_GLOBAL} = ${escaped};\n`;
	const stringCode = layout
		? globalLine +
		`import Lex from "@lek-js/lex";
import Page from "${page}";
import Layout from "${layout}";

Lex.mount(<Layout><Page/></Layout>);`
		: globalLine + `import "${page}";`;

	const out = await lexBuildHTML.byStringCode(stringCode, path.dirname(page), { minify });
	if(out.error) return out;

	const $ = cheerio.load(out.htmlText);
	injectStaticProps($, escaped);

	return { ...out, htmlText: $.html() };
};

module.exports = buildFRONT;
