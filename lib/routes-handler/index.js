/**@typedef {import('./types').RouteDefClass} RouteDefClass */
/**@typedef {import('./types').RoutesClass} RoutesClass */
/**@typedef {import('./types').RouteDef} RouteDefType */
/**@typedef {import('./types').Routes} RoutesType */

/**@type {RouteDefClass} */
class RouteDef
{
    /**
     * @param {ConstructorParameters<RouteDefClass>[0]} routeProps
     */
    constructor({ext, page, layout, serverProps})
    {
        this.ext = ext;
        this.page = page;
        this.layout = layout;
        this.serverProps = serverProps;
    }
    /** @type {RouteDefType["set"]}*/
    set(key, value)
    {
        this[key] = value;
    }
    /** @type {RouteDefType["get"]}*/
    get(key)
    {
        return this[key];
    }
}

/**@type {RoutesClass} */
class Routes
{
    /**@type {RoutesType["setRoute"]}*/
    setRoute(route, routeProps)
    {
        const routeDef = new RouteDef(routeProps);
        this[route] = routeDef;
    }

    /** @type {RoutesType["getRoute"]}*/
    getRoute(route)
    {
        return this[route];
    }

    /** @type {RoutesType["forEachRoute"]}*/
    forEachRoute(callback)
    {
        Object.entries(this).forEach(([route, routeDef]) => callback(route, routeDef));
    }
    /** @type {RoutesType["mapRoutes"]}*/
    mapRoutes(callback)
    {
        return Object.entries(this).map(([route, routeDef]) => callback(route, routeDef));
    }
}

const routesHandler = () => new Routes();

routesHandler.RouteDef = RouteDef;
routesHandler.Routes = Routes;

module.exports = routesHandler;