import { LexpressApp } from "../lex-press/types";

export interface Dir
{
    dirname: string;
    parent: Dir | null;
    elements: (File | Dir)[];
    files: File[];
    dirs: Dir[];
    forEachFile(callback: (file: File) => void): void;
}
export interface DirClass
{
    new(dirname: string, parent: Dir | null): Dir;
}

export interface File
{
    file: string;
    type: "static" | "dynamic";
    ext: "jsx" | "html";
    dir: Dir;
    get layout(): string;
    get route(): string;
}

export interface FileClass
{
    new(file: string, ext: File["ext"], type: File["type"], dir: Dir): File;
}

export type SetViewsDirFunction = (viewsDir: string, app: LexpressApp) => void;