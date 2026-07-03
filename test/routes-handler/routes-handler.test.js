const { describe, it, test } = require('node:test');
const assert = require('node:assert');
const routesHandler = require('#lib/routes-handler');

describe('Routes Handler', () =>
{
    describe('RouteDef Class', () =>
    {
        test("should create RouteDef instance with all properties", () =>
        {
            const serverProps = async(req) => ({ user: "test" });
            
            // Create a RouteDef using the class constructor directly
            const routeDef = new routesHandler.RouteDef({
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: serverProps
            });
            
            assert.strictEqual(routeDef.ext, "jsx");
            assert.strictEqual(routeDef.page, "home.jsx");
            assert.strictEqual(routeDef.layout, "layout.jsx");
            assert.strictEqual(routeDef.serverProps, serverProps);
        });

        test("should create RouteDef with null layout", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "html",
                page: "about.html",
                layout: null,
                serverProps: null
            });
            
            assert.strictEqual(routeDef.ext, "html");
            assert.strictEqual(routeDef.page, "about.html");
            assert.strictEqual(routeDef.layout, null);
            assert.strictEqual(routeDef.serverProps, null);
        });

        test("should set property using set method", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            });
            
            const newServerProps = async(req) => ({ data: "new" });
            routeDef.set("serverProps", newServerProps);
            
            assert.strictEqual(routeDef.serverProps, newServerProps);
        });

        test("should get property using get method", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            });
            
            assert.strictEqual(routeDef.get("ext"), "jsx");
            assert.strictEqual(routeDef.get("page"), "home.jsx");
            assert.strictEqual(routeDef.get("layout"), "layout.jsx");
            assert.strictEqual(routeDef.get("serverProps"), null);
        });

        test("should set and get different property types", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            });
            
            // Set different properties
            routeDef.set("ext", "html");
            routeDef.set("page", "new-page.html");
            routeDef.set("layout", null);
            
            // Verify changes
            assert.strictEqual(routeDef.get("ext"), "html");
            assert.strictEqual(routeDef.get("page"), "new-page.html");
            assert.strictEqual(routeDef.get("layout"), null);
        });
    });

    describe('Routes Class', () =>
    {
        test("should create empty Routes instance", () =>
        {
            const routes = routesHandler();
            
            assert.ok(routes !== undefined);
            assert.strictEqual(typeof routes.setRoute, 'function');
            assert.strictEqual(typeof routes.getRoute, 'function');
            assert.strictEqual(typeof routes.forEachRoute, 'function');
        });

        test("should set and get route", () =>
        {
            const routes = routesHandler();
            const routeProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            };
            
            routes.setRoute("/home", routeProps);
            const retrieved = routes.getRoute("/home");
            
            assert.strictEqual(retrieved.ext, "jsx");
            assert.strictEqual(retrieved.page, "home.jsx");
            assert.strictEqual(retrieved.layout, "layout.jsx");
            assert.strictEqual(retrieved.serverProps, null);
        });

        test("should return null for non-existent route", () =>
        {
            const routes = routesHandler();
            const result = routes.getRoute("/non-existent");
            
            assert.strictEqual(result, undefined);
        });

        test("should set multiple routes", () =>
        {
            const routes = routesHandler();
            
            const homeRouteProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            };
            const aboutRouteProps = {
                ext: "html",
                page: "about.html",
                layout: null,
                serverProps: null
            };
            
            routes.setRoute("/home", homeRouteProps);
            routes.setRoute("/about", aboutRouteProps);
            
            const homeRoute = routes.getRoute("/home");
            const aboutRoute = routes.getRoute("/about");
            
            assert.strictEqual(homeRoute.ext, "jsx");
            assert.strictEqual(homeRoute.page, "home.jsx");
            assert.strictEqual(aboutRoute.ext, "html");
            assert.strictEqual(aboutRoute.page, "about.html");
        });

        test("should iterate over all routes with forEachRoute", () =>
        {
            const routes = routesHandler();
            
            const homeRouteProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            };
            const aboutRouteProps = {
                ext: "html",
                page: "about.html",
                layout: null,
                serverProps: null
            };
            const contactRouteProps = {
                ext: "jsx",
                page: "contact.jsx",
                layout: "layout.jsx",
                serverProps: async() => ({ form: true })
            };
            
            routes.setRoute("/home", homeRouteProps);
            routes.setRoute("/about", aboutRouteProps);
            routes.setRoute("/contact", contactRouteProps);
            
            const collected = [];
            routes.forEachRoute((route, routeDef) =>
            {
                collected.push({ route, routeDef });
            });
            
            assert.strictEqual(collected.length, 3);
            assert.ok(collected.some(item => item.route === "/home"));
            assert.ok(collected.some(item => item.route === "/about"));
            assert.ok(collected.some(item => item.route === "/contact"));
            
            // Verify route properties
            const homeRoute = collected.find(item => item.route === "/home").routeDef;
            assert.strictEqual(homeRoute.ext, "jsx");
            assert.strictEqual(homeRoute.page, "home.jsx");
        });

        test("should handle empty routes in forEachRoute", () =>
        {
            const routes = routesHandler();
            const collected = [];
            
            routes.forEachRoute((route, routeDef) =>
            {
                collected.push({ route, routeDef });
            });
            
            assert.strictEqual(collected.length, 0);
        });

        test("should overwrite existing route", () =>
        {
            const routes = routesHandler();
            
            const originalRouteProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            };
            const newRouteProps = {
                ext: "html",
                page: "new-home.html",
                layout: null,
                serverProps: null
            };
            
            routes.setRoute("/home", originalRouteProps);
            assert.strictEqual(routes.getRoute("/home").ext, "jsx");
            
            routes.setRoute("/home", newRouteProps);
            assert.strictEqual(routes.getRoute("/home").ext, "html");
            assert.strictEqual(routes.getRoute("/home").page, "new-home.html");
        });

        test("should handle complex serverProps functions", () =>
        {
            const routes = routesHandler();
            
            const serverProps = async(req) => 
            {
                return {
                    user: req.user || "anonymous",
                    timestamp: Date.now(),
                    data: { nested: "value" }
                };
            };
            
            const routeProps = {
                ext: "jsx",
                page: "profile.jsx",
                layout: "layout.jsx",
                serverProps: serverProps
            };
            
            routes.setRoute("/profile", routeProps);
            
            const retrieved = routes.getRoute("/profile");
            assert.strictEqual(retrieved.serverProps, serverProps);
            assert.strictEqual(typeof retrieved.serverProps, 'function');
        });

        test("should map over all routes with mapRoutes", () =>
        {
            const routes = routesHandler();
            
            const homeRouteProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            };
            const aboutRouteProps = {
                ext: "html",
                page: "about.html",
                layout: null,
                serverProps: null
            };
            const contactRouteProps = {
                ext: "jsx",
                page: "contact.jsx",
                layout: "layout.jsx",
                serverProps: async() => ({ form: true })
            };
            
            routes.setRoute("/home", homeRouteProps);
            routes.setRoute("/about", aboutRouteProps);
            routes.setRoute("/contact", contactRouteProps);
            
            // Map routes to get just the page names
            const pageNames = routes.mapRoutes((route, routeDef) => routeDef.page);
            
            assert.strictEqual(pageNames.length, 3);
            assert.ok(pageNames.includes("home.jsx"));
            assert.ok(pageNames.includes("about.html"));
            assert.ok(pageNames.includes("contact.jsx"));
        });

        test("should return empty array when mapping over empty routes", () =>
        {
            const routes = routesHandler();
            
            const result = routes.mapRoutes((route, routeDef) => routeDef.page);
            
            assert.deepStrictEqual(result, []);
            assert.strictEqual(result.length, 0);
        });
    });

    describe('Integration Tests', () =>
    {
        test("should create complete route setup", () =>
        {
            const routes = routesHandler();
            
            // Create multiple routes with different configurations
            const homeRouteProps = {
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: async() => ({ page: "home" })
            };
            const apiRouteProps = {
                ext: "html",
                page: "api-docs.html",
                layout: null,
                serverProps: null
            };
            const dashboardRouteProps = {
                ext: "jsx",
                page: "dashboard.jsx",
                layout: "admin-layout.jsx",
                serverProps: async(req) => ({ user: req.user })
            };
            
            // Set routes
            routes.setRoute("/", homeRouteProps);
            routes.setRoute("/api", apiRouteProps);
            routes.setRoute("/dashboard", dashboardRouteProps);
            
            // Verify all routes exist
            assert.strictEqual(routes.getRoute("/").ext, "jsx");
            assert.strictEqual(routes.getRoute("/api").ext, "html");
            assert.strictEqual(routes.getRoute("/dashboard").ext, "jsx");
            
            // Verify route count via iteration
            let routeCount = 0;
            routes.forEachRoute(() => routeCount++);
            assert.strictEqual(routeCount, 3);
            
            // Verify route modifications
            const dashboardRoute = routes.getRoute("/dashboard");
            dashboardRoute.set("layout", "new-admin-layout.jsx");
            assert.strictEqual(routes.getRoute("/dashboard").get("layout"), "new-admin-layout.jsx");
        });
    });
});
