/**
 * @file
 * @source ./lib/builder-virtual-plugin/index.js
 * @description Plugin virtual de esbuild para lex-press-builder: intercepta cualquier
 * import/require de "lex-press" y lo reemplaza por el template de producción
 * (lib/lex-press-production/index.js) leído en tiempo de build.
 */

const fsSync = require("fs");
const path = require("path");

/**
 * @import {Plugin} from "esbuild";
 */

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

module.exports = virtualLexPressPlugin;
