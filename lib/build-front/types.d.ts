import { RouteDef } from "../routes-handler/types";

export interface BuildFRONT
{
    (routeDef: RouteDef, minify: boolean): Promise<string>;
    html: (input: string, minify: boolean) => Promise<string>;
    jsx: (page: string, layout: string|null, minify: boolean) => Promise<string>;
}