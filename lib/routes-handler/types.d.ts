import { ServerPropsFunc } from "../server-props-html/types";

type routePropKeys = "ext" | "page" | "layout" | "bundle" | "serverProps";
type routeProp<T extends routePropKeys> =
T extends "serverProps" ? ServerPropsFunc :
T extends "ext" ? string :
T extends "page" ? string :
T extends "layout" ? string | null :
never;

export interface RouteProps
{
    ext: string;
    page: string;
    layout: string | null;
    serverProps: (req: Request) => Promise<Record<string, any>>|Record<string, any>;
}

export interface RouteDef
{
    ext: string;
    page: string;
    layout: string | null;
    serverProps: (req: Request) => Promise<Record<string, any>>|Record<string, any>;
    set<T extends routePropKeys>(key: T, value: routeProp<T>): void;
    get<T extends routePropKeys>(key: T): routeProp<T>;
}

export interface Routes
{
    [route: string]: RouteDef;
    setRoute(route: string, routeProps: RouteProps): void;
    getRoute(route: string): RouteDef | null;
    forEachRoute(callback: (route: string, routeDef: RouteDef) => void): void;
    mapRoutes(callback: (route: string, routeDef: RouteDef) => void): void;
}

export interface RouteDefClass extends Function
{
    new(routeProps: RouteProps): RouteDef;
}

export interface RoutesClass extends Function
{
    new(): Routes;
}