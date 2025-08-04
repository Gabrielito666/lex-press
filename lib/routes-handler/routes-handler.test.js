import { describe, it, expect, test } from 'vitest';
const routesHandler = require('./index.js');

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
            
            expect(routeDef.ext).toBe("jsx");
            expect(routeDef.page).toBe("home.jsx");
            expect(routeDef.layout).toBe("layout.jsx");
            expect(routeDef.serverProps).toBe(serverProps);
        });

        test("should create RouteDef with null layout", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "html",
                page: "about.html",
                layout: null,
                serverProps: null
            });
            
            expect(routeDef.ext).toBe("html");
            expect(routeDef.page).toBe("about.html");
            expect(routeDef.layout).toBe(null);
            expect(routeDef.serverProps).toBe(null);
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
            
            expect(routeDef.serverProps).toBe(newServerProps);
        });

        test("should get property using get method", () =>
        {
            const routeDef = new routesHandler.RouteDef({
                ext: "jsx",
                page: "home.jsx",
                layout: "layout.jsx",
                serverProps: null
            });
            
            expect(routeDef.get("ext")).toBe("jsx");
            expect(routeDef.get("page")).toBe("home.jsx");
            expect(routeDef.get("layout")).toBe("layout.jsx");
            expect(routeDef.get("serverProps")).toBe(null);
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
            expect(routeDef.get("ext")).toBe("html");
            expect(routeDef.get("page")).toBe("new-page.html");
            expect(routeDef.get("layout")).toBe(null);
        });
    });

    describe('Routes Class', () =>
    {
        test("should create empty Routes instance", () =>
        {
            const routes = routesHandler();
            
            expect(routes).toBeDefined();
            expect(typeof routes.setRoute).toBe('function');
            expect(typeof routes.getRoute).toBe('function');
            expect(typeof routes.forEachRoute).toBe('function');
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
            
            expect(retrieved.ext).toBe("jsx");
            expect(retrieved.page).toBe("home.jsx");
            expect(retrieved.layout).toBe("layout.jsx");
            expect(retrieved.serverProps).toBe(null);
        });

        test("should return null for non-existent route", () =>
        {
            const routes = routesHandler();
            const result = routes.getRoute("/non-existent");
            
            expect(result).toBe(undefined);
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
            
            expect(homeRoute.ext).toBe("jsx");
            expect(homeRoute.page).toBe("home.jsx");
            expect(aboutRoute.ext).toBe("html");
            expect(aboutRoute.page).toBe("about.html");
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
            
            expect(collected).toHaveLength(3);
            expect(collected.some(item => item.route === "/home")).toBe(true);
            expect(collected.some(item => item.route === "/about")).toBe(true);
            expect(collected.some(item => item.route === "/contact")).toBe(true);
            
            // Verify route properties
            const homeRoute = collected.find(item => item.route === "/home").routeDef;
            expect(homeRoute.ext).toBe("jsx");
            expect(homeRoute.page).toBe("home.jsx");
        });

        test("should handle empty routes in forEachRoute", () =>
        {
            const routes = routesHandler();
            const collected = [];
            
            routes.forEachRoute((route, routeDef) =>
            {
                collected.push({ route, routeDef });
            });
            
            expect(collected).toHaveLength(0);
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
            expect(routes.getRoute("/home").ext).toBe("jsx");
            
            routes.setRoute("/home", newRouteProps);
            expect(routes.getRoute("/home").ext).toBe("html");
            expect(routes.getRoute("/home").page).toBe("new-home.html");
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
            expect(retrieved.serverProps).toBe(serverProps);
            expect(typeof retrieved.serverProps).toBe('function');
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
            
            expect(pageNames).toHaveLength(3);
            expect(pageNames).toContain("home.jsx");
            expect(pageNames).toContain("about.html");
            expect(pageNames).toContain("contact.jsx");
        });

        test("should return empty array when mapping over empty routes", () =>
        {
            const routes = routesHandler();
            
            const result = routes.mapRoutes((route, routeDef) => routeDef.page);
            
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
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
            expect(routes.getRoute("/").ext).toBe("jsx");
            expect(routes.getRoute("/api").ext).toBe("html");
            expect(routes.getRoute("/dashboard").ext).toBe("jsx");
            
            // Verify route count via iteration
            const routeCount = { current: 0 };
            routes.forEachRoute(() => routeCount.current++);
            expect(routeCount.current).toBe(3);
            
            // Verify route modifications
            const dashboardRoute = routes.getRoute("/dashboard");
            dashboardRoute.set("layout", "new-admin-layout.jsx");
            expect(routes.getRoute("/dashboard").get("layout")).toBe("new-admin-layout.jsx");
        });
    });
});
