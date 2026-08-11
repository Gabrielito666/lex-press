/**
 * @file
 * @source ./lib/builder-helpers/index.js
 * @description Helpers de build de lex-press-builder: compilan cada vista (buildView)
 * y el server de producción (buildServer) con esbuild.
 */

const fs = require('fs').promises;
const path = require('path');
const esbuild = require('esbuild');
const buildFRONT = require('#lib/build-front');
const { buildOptions } = require('#lib/builder-options');
const virtualLexPressPlugin = require('#lib/builder-virtual-plugin');

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

	const outPath = path.resolve(outputViewsDir, outName);
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

module.exports = {
	buildView,
	buildServer,
};
