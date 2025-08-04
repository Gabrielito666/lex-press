import { Express, Application } from "express";
import { LexpressCacheHandler } from "../routes-handler/types";

export type ServerPropsFunc = (req : Request) => Object|Promise<Object>;

export interface LexpressDevApp extends Application
{
    public(path : string): LexpressDevApp;
    views(viewsDir : string): LexpressDevApp;
    jsx:
    {
        (route : string, page : string, layout : string|null):{
            serverProps : (serverPropsFunc : ServerPropsFunc) => void;
        }
    }
    html:
    {
        (route : string, page : string):{
            serverProps : (serverPropsFunc : ServerPropsFunc) => void;
        }
    }
    lexpress:
    {
        cache: LexpressCacheHandler;
    }
}

export type LexpressDev = () => LexpressDevApp;