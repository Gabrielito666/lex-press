import { LexpressDevApp } from "../lex-press-dev/types.d.ts";
import { ServerPropsFunc } from "../server-props-html/types";

export interface Dir
{
    dirname: string;
    parent: Dir | null;
    page: Page | null;
    dirs: Dir[];
    layoutPath: string | null;
    pagePath: string | null;
    serverPropsPath: string | null;
    forEachFile(callback: (file: Page) => void): void;
}
export interface DirClass
{
    new(dirname: string, parent: Dir | null): Dir;
}

export interface Page
{
    file: string;
    ext: "jsx" | "html";
    dir: Dir;
    get layout(): string;
    get route(): string;
    get serverPropsModule(): string | null;
}

export interface PageClass
{
    new(file: string, ext: Page["ext"], dir: Dir): Page;
}