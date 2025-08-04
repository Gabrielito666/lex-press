import { Express, Application } from "express";
import { ServerPropsFunc } from "../server-props-html/types";

export interface BuildedRoutes
{
    [route : string] : {
        htmlBase64 : string;
        serverProps : ServerPropsFunc | null;
    }
}

export interface LexpressApp extends Application
{
    public(path : string): LexpressApp;
    views(viewsDir : string): LexpressApp;
    jsx:
    {
        (route : string, page : string, layout : string|null):{
            serverProps : (serverPropsFunc : ServerPropsFunc) => void
        }
    }
    html:
    {
        (route : string, page : string): {
            serverProps : (serverPropsFunc : ServerPropsFunc) => void
        }
    }

    listen(...params: Parameters<Application["listen"]>): void;
}

export type Lexpress = () => LexpressApp;