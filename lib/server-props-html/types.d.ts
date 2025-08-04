import { Request } from "express";

export type ServerPropsFunc = (req : Request) => Promise<Record<string, string>>|Record<string, string>;

export type ServerPropsHTML = (html : string, serverProps : ServerPropsFunc, req : Request) => Promise<string>;