/**
 * @typedef {{
 *	ext: "html"|"jsx";
 *	page: string;
 *	layout: string|null;
 * }} RouteProps
 */

class RouteDef
{
	/**
	 * @param {RouteProps} routeProps
	 */
	constructor({ext, page, layout})
	{
		/** @type {string} */
		this.ext = ext;
		/** @type {string} */
		this.page = page;
		/** @type {string|null} */
		this.layout = layout;
	}

	/**
	 * @param {"ext"|"page"|"layout"} key
	 * @param {string} value
	 * @returns {void}
	 */
	set(key, value)
	{
		this[key] = value;
	}

	/**
	 * @template {"ext"|"page"|"layout"} K
	 * @param {K} key
	 * @returns {(typeof this)[K]}
	 */
	get(key)
	{
		return this[key];
	}
}

class Routes
{
	constructor()
	{
		/**@private @type {Map<string, RouteDef>}*/
		this._map = new Map();
	}

	/**
	 * @param {string} route
	 * @param {RouteProps} routeProps
	 * @returns {void}
	 */
	setRoute(route, routeProps)
	{
		const routeDef = new RouteDef(routeProps);
		this._map.set(route, routeDef);
	}

	/**
	 * @param {string} route
	 * @returns {RouteDef|undefined}
	 */
	getRoute(route)
	{
		return this._map.get(route);
	}
	/**
	 * @param {string} route
	 * @returns {boolean}
	 */
	hasRoute(route)
	{
		return this._map.has(route);
	}

	/**
	 * @param {(route: string, routeDef: RouteDef) => void} callback
	 * @returns {void}
	 */
	forEachRoute(callback)
	{
		this._map.forEach((routeDef, route) => callback(route, routeDef));
	}

	/**
	 * @template T
	 * @param {(route: string, routeDef: RouteDef) => T} callback
	 * @returns {T[]}
	 */
	mapRoutes(callback)
	{
		/**@type {T[]}*/
		const routes = [];
		this._map.forEach((routeDef, route) => { routes.push(callback(route, routeDef)); });

		return routes;
	}
}

/**
 * @returns {Routes}
 */
const routesHandler = () => new Routes();

routesHandler.RouteDef = RouteDef;
routesHandler.Routes = Routes;

module.exports = routesHandler;
