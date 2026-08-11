/**
 * @file
 * @source ./test/unit/routes-map/index.test.js
 * @description Tests unitarios para lib/routes-map
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RoutesMap = require("#lib/routes-map");

/**
 * @typedef {{ ext: "html"|"jsx"; page: string; layout: string|null; }} IPage
 * @typedef {{ name: string }} IAsset
 * @typedef {{ type: "page" } & IPage|{ type: "asset" } & IAsset} IRoute
 */

/**
 * @param {string} page
 * @param {"html"|"jsx"} [ext]
 * @param {string|null} [layout]
 * @returns {IRoute}
 */
const createPage = (page, ext = "html", layout = null) =>
{
	return { type: "page", ext, page, layout };
};

/**
 * @param {string} name
 * @returns {IRoute}
 */
const createAsset = (name) =>
{
	return { type: "asset", name };
};

describe("RoutesMap", () =>
{
	it("constructor: inicia con mapa interno vacío", () =>
	{
		const routesMap = new RoutesMap();

		assert.equal(routesMap.getRoute("/"), undefined);
		assert.equal(routesMap.hasRoute("/"), false);
	});

	it("setRoute: guarda ruta y getRoute la recupera idéntica", () =>
	{
		const routesMap = new RoutesMap();
		const homeRoute = createPage("/", "html", null);

		routesMap.setRoute("/", homeRoute);

		assert.deepEqual(routesMap.getRoute("/"), homeRoute);
	});

	it("getRoute: ruta inexistente retorna undefined", () =>
	{
		const routesMap = new RoutesMap();

		assert.equal(routesMap.getRoute("/inexistente"), undefined);
	});

	it("hasRoute: true cuando la ruta fue registrada", () =>
	{
		const routesMap = new RoutesMap();

		routesMap.setRoute("/about", createPage("/about", "jsx", null));

		assert.equal(routesMap.hasRoute("/about"), true);
	});

	it("hasRoute: false cuando la ruta no existe", () =>
	{
		const routesMap = new RoutesMap();

		assert.equal(routesMap.hasRoute("/no-existe"), false);
	});

	it("setRoute: sobreescribe una ruta existente con la nueva definición", () =>
	{
		const routesMap = new RoutesMap();
		const inicial = createPage("/about/contact", "jsx", null);
		const actualizada = createPage("/about/contact", "html", "/layouts/main");

		routesMap.setRoute("/about/contact", inicial);
		routesMap.setRoute("/about/contact", actualizada);

		assert.deepEqual(routesMap.getRoute("/about/contact"), actualizada);
	});

	it("forEachRoute: itera en orden de inserción con (route, routeDef)", () =>
	{
		const routesMap = new RoutesMap();
		const home = createPage("/", "html", null);
		const about = createPage("/about", "jsx", "/layouts/main");
		/**@type {Array<{ route: string; routeDef: IRoute }>}*/
		const visitados = [];

		routesMap.setRoute("/", home);
		routesMap.setRoute("/about", about);

		routesMap.forEachRoute((route, routeDef) => { visitados.push({ route, routeDef }); });

		assert.equal(visitados.length, 2);
		assert.equal(visitados[0].route, "/");
		assert.equal(visitados[1].route, "/about");
		assert.deepEqual(visitados[0].routeDef, home);
		assert.deepEqual(visitados[1].routeDef, about);
	});

	it("mapRoutes: retorna array con resultado del callback por ruta", () =>
	{
		const routesMap = new RoutesMap();

		routesMap.setRoute("/", createPage("/", "html", null));
		routesMap.setRoute("/about", createPage("/about", "jsx", "/layouts/main"));
		routesMap.setRoute("/about/contact", createAsset("main.js"));

		const resultados = routesMap.mapRoutes((route, routeDef) => `${route} -> ${routeDef.type}`);

		assert.deepEqual(resultados, [
			"/ -> page",
			"/about -> page",
			"/about/contact -> asset"
		]);
	});

	it("mapRoutes: mapa vacío retorna array vacío", () =>
	{
		const routesMap = new RoutesMap();

		const resultados = routesMap.mapRoutes((route) => route);

		assert.deepEqual(resultados, []);
	});
});
