const fs = require('fs');
const path = require('path');

/**
 * @typedef {import('./types.d.ts').Dir} Dir
 * @typedef {import('./types.d.ts').File} File
 * @typedef {import('./types.d.ts').DirClass} DirClass
 * @typedef {import('./types.d.ts').FileClass} FileClass
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
        this.dirname = dirname;
        this.parent = parent;
        this.elements = fs.readdirSync(dirname);
        this.files = [];
        this.dirs = [];
        const posibleLayoutPaht = path.resolve(dirname, "layout.jsx");
        this.layoutPath = fs.existsSync(posibleLayoutPaht) ? posibleLayoutPaht : null;
        this.elements.forEach(e =>
        {
            const elementPath = path.resolve(dirname, e);
            const isDir = fs.statSync(elementPath).isDirectory();
            if(isDir)
            {
                this.dirs.push(new Dir(elementPath, this));
                return;
            }

            const isFile = fs.statSync(elementPath).isFile();
            const isPage = path.basename(elementPath).startsWith('page');
            const isJsx = path.extname(elementPath).includes('jsx');
            const type = (
                elementPath.includes(".static.") || !elementPath.includes(".dynamic.")
            ) ? "static" : "dynamic";
            
            if(isFile && isPage && isJsx)
            {
                this.files.push(new File(elementPath, "jsx", type, this));
                return;
            }
            const isHtml = path.extname(elementPath).includes('html');
            if(isFile && isPage && isHtml)
            {
                this.files.push(new File(elementPath, "html", type, this));
                return;
            }
        });
    }
    /**
     * @type {Dir["forEachFile"]}
     */
    forEachFile(callback)
    {
        this.files.forEach(callback);
        this.dirs.forEach(dir => dir.forEachFile(callback));
    }
}

/**@type {FileClass} */
const File = class
{
    /**
     * @param {ConstructorParameters<FileClass>[0]} file
     * @param {ConstructorParameters<FileClass>[1]} ext
     * @param {ConstructorParameters<FileClass>[2]} type
     * @param {ConstructorParameters<FileClass>[3]} dir
     */
    constructor(file, ext, type, dir)
    {
        this.file = file;
        this.type = type;
        this.ext = ext;
        this.dir = dir;
    }
    /**
     * @returns {ReturnType<File["layout"]>}
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
     * @returns {ReturnType<File["route"]>}
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
}

/**@type {SetViewsDirFunction} */
const setViewsDir = (viewsDir, app) =>
{

    const dir = new Dir(viewsDir, null);

    dir.forEachFile(f =>
    {
        if(f.ext === "jsx" && f.type === "static")
        {
            if(!f.layout) throw new Error(`Layout not found for ${f.file}`);
            app.jsx.static(f.route, f.file, f.layout);
        }
        else if(f.ext === "html" && f.type === "static")
        {
            app.html.static(f.route, f.file, f.layout);
        }
        else if(f.ext === "jsx" && f.type === "dynamic")
        {
            if(!f.layout) throw new Error(`Layout not found for ${f.file}`);
            app.jsx.dynamic(f.route, f.file);
        }
        else if(f.ext === "html" && f.type === "dynamic")
        {
            app.html.dynamic(f.route, f.file);
        }
    });
}

module.exports = setViewsDir;