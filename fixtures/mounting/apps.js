/**
 * @file
 * @source ./fixtures/mounting/apps.js
 * @description Crea dos apps lexpress (app1 raíz y app2 montable) con views y
 * public propios, para probar el montaje de sub-apps (app1.use(app2) y
 * app1.use("/app-2", app2)) en dev y en producción. El mismo módulo se
 * bundlea al compilar: require("lex-press") se resuelve a dev o producción
 * según el entorno.
 */

const lexpress = require("lex-press");
const path = require("path");

/**
 * @typedef {ReturnType<typeof lexpress>} LexApp
 */

/**
 * @param {{ app1Tag?: string; app2Tag?: string }} [options] Tags de las apps
 * (en dev deben ser únicos por instancia: el dev server valida tags globales).
 * @returns {{ app1: LexApp; app2: LexApp }}
 */
const createApps = (options = {}) =>
{
	const app1 = lexpress({ tag: options.app1Tag ?? "app1" });
	const app2 = lexpress({ tag: options.app2Tag ?? "app2" });

	app1.views(path.resolve(process.cwd(), "fixtures/mounting/views1"));
	app1.public(path.resolve(process.cwd(), "fixtures/mounting/public1"));

	app2.views(path.resolve(process.cwd(), "fixtures/mounting/views2"));
	app2.public(path.resolve(process.cwd(), "fixtures/mounting/public2"));

	return { app1, app2 };
};

module.exports = { createApps };
