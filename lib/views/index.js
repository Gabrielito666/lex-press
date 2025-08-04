const fs = require('fs');
const path = require('path');

/**
 * @typedef {import('./types.d.ts').Dir} Dir
 * @typedef {import('./types.d.ts').Page} PageType
 * @typedef {import('./types.d.ts').DirClass} DirClass
 * @typedef {import('./types.d.ts').PageClass} PageClass
 * @typedef {import('./types.d.ts').SetViewsDirFunction} SetViewsDirFunction
*/

/**@type {DirClass} */
const Dir = class
{
    /**
     * @param {ConstructorParameters<DirClass>[0]} dirname
     * @param {ConstructorParameters<DirClass>[1]} parent
    */
    constructor(dirname, parent)
    {
        const elements = fs.readdirSync(dirname);

        this.dirname = dirname;
        this.parent = parent;
        this.dirs = [];
        this.page = null;

        const posibleLayoutPath = path.resolve(dirname, "layout.jsx");
        const posibleServerPropsPath = path.resolve(dirname, "server-props.js");
        const posiblePageHtmlPath = path.resolve(dirname, "page.html");
        const posiblePageJsxPath = path.resolve(dirname, "page.jsx");

        this.layoutPath = fs.existsSync(posibleLayoutPath) ? posibleLayoutPath : null;
        this.serverPropsPath = fs.existsSync(posibleServerPropsPath) ? posibleServerPropsPath : null;
        this.pagePath = fs.existsSync(posiblePageHtmlPath) ? posiblePageHtmlPath : null;

        if(fs.existsSync(posiblePageJsxPath))
        {
            // if there is a page.jsx, it will override the page.html
            this.pagePath = posiblePageJsxPath;
        }

        if(this.pagePath)
        {
            const ext = path.extname(this.pagePath);
            this.page = new Page(this.pagePath, ext.slice(1), this);
        }

        elements.forEach(e =>
        {
            const elementPath = path.resolve(dirname, e);
            const isDir = fs.statSync(elementPath).isDirectory();
            if(isDir)
            {
                this.dirs.push(new Dir(elementPath, this));
                return;
            }
        });
    }
    /**
     * @type {Dir["forEachFile"]}
     */
    forEachFile(callback)
    {
        if(this.page) callback(this.page);
        this.dirs.forEach(dir => dir.forEachFile(callback));
    }
}

/**@type {PageClass} */
const Page = class
{
    /**
     * @param {ConstructorParameters<PageClass>[0]} file
     * @param {ConstructorParameters<PageClass>[1]} ext
     * @param {ConstructorParameters<PageClass>[2]} dir
     */
    constructor(file, ext, dir)
    {
        this.file = file;
        this.ext = ext;
        this.dir = dir;
    }
    /**
     * @returns {ReturnType<PageType["layout"]>}
     */
    get layout()
    {
        const dirRef = { current: this.dir };
        while(true)
        {
            if(dirRef.current.layoutPath)
            {
                return dirRef.current.layoutPath;
            }
            else if(dirRef.current.parent) // if no layout found, go up one level
            {
                dirRef.current = dirRef.current.parent;
            }
            else break; // if no layout found, return null
        }
        return null;
    }
    /**
     * @returns {ReturnType<PageType["route"]>}
     */
    get route()
    {
        const parentRoutes = [];
        let currentDir = this.dir;
        while(currentDir.parent) //esto no incluye views directory
        {
            parentRoutes.push(path.basename(currentDir.dirname));
            currentDir = currentDir.parent;
        }
        const route = "/" + parentRoutes.reverse().join("/");
        return route;
    }

    /**
     * @returns {ReturnType<PageType["serverProps"]>}
     */
    get serverPropsModule()
    {
        if (!this.dir.serverPropsPath) return null;
        return this.dir.serverPropsPath;
    }
}

const Views = Dir;
module.exports = Views;