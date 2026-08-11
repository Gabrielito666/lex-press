const express = require('express');
const cookieParser = require('cookie-parser');
const Views = require('#lib/views');
const BuilderQueue = require("#lib/builder-queue");
const buildFRONT = require('#lib/build-front');
const fs = require('fs').promises;
const fsSync = require("fs");
const path = require('path');
const esbuild = require('esbuild');
const { parseArgs } = require("util");

/**
 * @import { LexpressDevApp } from "#lib/lex-press-dev";
 * @import {Plugin} from "esbuild";
 */

const cliOptions  = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		build: { type: "boolean" },
		format: { type: "string", },
		platform: { type: "string", },
		target: { type: "string", },
		bundle: { type: "boolean", },
		minify: { type: "boolean", },
		sourcemap: { type: "boolean", },
		treeShaking: { type: "boolean", },
		external: { type: "string", multiple: true, },
		tsconfig: { type: "string", },
	},
});

/**
 * @template {readonly string[]} T
 * @param {string | undefined} value
 * @param {T} allowed
 * @param {string} name
 * @returns {T[number] | undefined}
 */
const enumValue = (value, allowed, name) =>
{
	if (value === undefined)
		return undefined;

	if (allowed.includes(value))
		return value;

	throw new TypeError(
		`Invalid --${name}: "${value}". Expected one of: ${allowed.join(", ")}`
	);
}

const FORMAT = /** @type {const} */ (["esm", "cjs", "iife"]);
const PLATFORM = /** @type {const} */ (["browser", "node", "neutral"]);

const buildOptions = {
	format: enumValue(cliOptions.values.format, FORMAT, "format"),
	platform: enumValue(cliOptions.values.platform, PLATFORM, "platform"),
	sourcemap: cliOptions.values.sourcemap,
	target: cliOptions.values.target,
	bundle: cliOptions.values.bundle,
	minify: cliOptions.values.minify,
	treeShaking: cliOptions.values.treeShaking,
	external: cliOptions.values.external,
	tsconfig: cliOptions.values.tsconfig,
};
Object.keys(buildOptions).forEach(key =>
{
	///@ts-ignore
	if(buildOptions[key] === undefined) delete buildOptions[key];
});

const libProductionTemplatePath = path.resolve(__dirname, "../lex-press-production/index.js");
const libProductionTemplate = fsSync.readFileSync(libProductionTemplatePath, "utf-8");

/**@type {Plugin}*/
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
	contents: libProductionTemplate,
	loader: "js",
	resolveDir: path.resolve(process.cwd(), "node_modules/lex-press/lib/lex-press-production/")
    }));
    }
};

/**
 * @param {string} route
 * @param {import('#lib/routes-map').IPage} routeDef
 * @param {string} outputViewsDir
 * @param {string} outputAssetsDir
 */
const buildView = async (route, routeDef, outputViewsDir, outputAssetsDir) =>
{
	const out = await buildFRONT(routeDef, true);
	if(out.error) throw out.error;

	out.warnings.forEach(console.warn);

	const pageOutDir = path.resolve(outputViewsDir, "."+route);
	await fs.mkdir(pageOutDir, { recursive: true });
	const outName = path.resolve(pageOutDir, "index.html");

	const outPath = path.resolve(outputDir, "views", outName);
	await fs.writeFile(outPath, out.htmlText, "utf-8");

	for(const asset of out.assets)
	{
		const assetPath = path.resolve(outputAssetsDir, path.basename(asset.path));
		await fs.writeFile(assetPath, Buffer.from(asset.contents));
	};
}

/**
 * @param {string} outputServerFile
 */
const buildServer = async(outputServerFile) =>
{
	const entryPoint = path.resolve(process.cwd(), process.argv[1]);
	
	/**@type {import("esbuild").BuildOptions}*/
	const options = Object.assign({
		entryPoints: [entryPoint],
		outfile: outputServerFile,
		treeShaking: true,
		bundle: true,
		minify: true,
		platform: "node",
		target: "node22",
		plugins: [virtualLexPressPlugin],
	}, buildOptions);

	await esbuild.build(options);
}

//Init de global bundle
const globalQueue = new BuilderQueue(async() =>
{
	if(fsSync.existsSync(outputDir))
	{
		await fs.rm(outputDir, { recursive:true, force: true });
	}
	await fs.mkdir(outputDir);
});

/**@type {Array<InstanceType<typeof BuilderQueue>>}*/
const localQueuesList = [];

let tagsCounter = 0;

const routesMap = {};

const outputDir = path.resolve(process.cwd(), ".lex-press-app");
const outputServerFile = path.resolve(outputDir, "server.js");

/** @type {typeof import("#lib/lex-press-dev")} */
const lexpress = (options) =>
{	
	const tag = options?.tag ?? String(tagsCounter);
	tagsCounter++;
	
	if(Object.keys(routesMap).includes(tag))
	{
		throw new Error("[LEX-PRESS BUILDER ERROR]: Conflicto entre los tags de las instancias de lexpress-app. evita usar el mismo tag en diferentes apps. Puede que haya un conflicto  si el nombre que pusiste es un numero o dos tienen el mismo tag.");
	}
	const app = /** @type {LexpressDevApp} */(/**@type {unknown}*/(express()));

	app.use(express.json());
	app.use(cookieParser());

	const outputTagDir = path.resolve(outputDir, tag);
	const outputPublicDir = path.resolve(outputTagDir, "public");
	const outputViewsDir = path.resolve(outputTagDir, "views");
	const outputAssetsDir = path.resolve(outputTagDir, "assets");

	const localQueue = new BuilderQueue(async() =>
	{
		await globalQueue.init;
		await fs.mkdir(outputPublicDir);
		await fs.mkdir(outputViewsDir);
		await fs.mkdir(outputAssetsDir);
	});
	localQueuesList.push(localQueue);
	
	let publicDirsCounter = 0;
	/**
	 * @param {string} publicPath
	 * @returns {LexpressDevApp}
	 */
	app.public = (publicPath) =>
	{
		app.use(express.static(publicPath));

		localQueue.add(async () =>
		{
			const dirPath = path.resolve(outputPublicDir, String(publicDirsCounter++));
			await fs.cp(publicPath, dirPath, { recursive: true });
		});

		return app;
	};
	
	/**
	 * @param {string} viewsDir
	 * @returns {LexpressDevApp}
	 */
	app.views = (viewsDir) =>
	{
		const dir = new Views(viewsDir, null);
		dir.forEachJSXFile(page => { app.jsx(page.route, page.file, page.layout); });
		dir.forEachHTMLFile(page => { app.html(page.route, page.file); });
		return app;
	};

	/**
	 * @param {string} route
	 * @param {string} page
	 * @returns {LexpressDevApp}
	 */
	app.html = (route, page) =>
	{
		localQueue.add(() => buildView(route, { ext: "html", page, layout: null }, outputViewsDir, outputAssetsDir));
		return app;
	};

	/**
	 * @param {string} route
	 * @param {string} page
	 * @param {string|null} layout
	 * @returns {LexpressDevApp}
	 */
	app.jsx = (route, page, layout) =>
	{
		localQueue.add(() => buildView(route, { ext: "jsx", page, layout }, outputViewsDir, outputAssetsDir));
		return app;
	};

	/**@type {import('express').Application["listen"]}*/
	app.listen = async(...params) =>
	{
		try
		{
			globalQueue.add(() => buildServer(outputServerFile));
			localQueuesList.forEach(q =>
			{
				globalQueue.add(() => q.all());
			});

			await globalQueue.all();

			console.log("Builded server folder created at .lex-press-app/");

			if(fsSync.readFileSync(path.resolve(process.cwd(), ".lex-press-app/server.js"), "utf-8").includes("__dirname"))
			{
				console.warn("The server file contains __dirname, this is not supported by the production server. Please use process.cwd() instead.");
			}

		}
		catch(err)
		{
			console.error("[LEX-PRESS BUILD ERROR]: An error occurred while building the application.");
			await fs.rm(outputDir, { recursive: true, force: true });
			console.error(err);
			process.exit(1);
		}

		process.exit(0);
	};
	
	return app;
};

module.exports = lexpress;
