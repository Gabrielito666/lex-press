import { Express, Application } from "express";

interface LexpressCache
{
    [key : string] : { type : "html", path : string, bundle : string | null } | { type : "jsx", path : string, layout : string, bundle : string | null };
}

export interface LexpressApp extends Application
{
    public(path : string): LexpressApp;
    views(viewsDir : string): LexpressApp;
    jsx:
    {
        (route : string, path : string, layout : string):void;
        static(route : string, path : string, layout : string):void;
        dynamic(route : string, path : string, layout : string):void;
    }
    html:
    {
        (route : string, path : string): LexpressApp;
        static(route : string, path : string):void;
        dynamic(route : string, path : string):void;
    }
    lexpress:
    {
        cache: LexpressCache;
    }
    listen(...params: Parameters<Application["listen"]>): void;
}

export type Lexpress = () => LexpressApp;