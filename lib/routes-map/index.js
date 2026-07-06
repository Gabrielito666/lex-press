/**
 * @typedef {{ ext: "html"|"jsx"; page: string; layout: string|null; }} IPage
 * @typedef {{ name: string }} IAsset
 * @typedef {{ type: "page" } & IPage|{ type: "asset" } & IAsset} IRoute
 */

class RoutesMap
{
	constructor()
	{
		/**@private @type {Map<string, IRoute>}*/
		this._map = new Map();
	}

	/**
	 * @param {string} route
	 * @param {IRoute} routeDef 
	 * @returns {void}
	 */
	setRoute(route, routeDef)
	{
		this._map.set(route, routeDef);
	}
	/**
	 * @param {string} route
	 * @returns {IRoute|undefined}
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
	 * @param {(route: string, routeDef: IRoute) => void} callback
	 * @returns {void}
	 */
	forEachRoute(callback)
	{
		this._map.forEach((routeDef, route) => callback(route, routeDef));
	}

	/**
	 * @template T
	 * @param {(route: string, routeDef: IRoute) => T} callback
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

 module.exports = RoutesMap;
