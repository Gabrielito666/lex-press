const fs = require('fs');
const path = require('path');

class Views
{
    constructor(viewsDir, app)
    {
        this._app = app;
        this._layout = path.resolve(viewsDir, "layout.jsx");
        const files = getAllFiles(viewsDir)
        .filter((route) =>
        {
            return path.basename(route).startsWith('page') && (route.endsWith(".jsx") || route.endsWith(".html"))
        })
        
        files.forEach(route =>
        {
            const relativePath = path.relative(viewsDir, route);
            const routeBase = path.dirname(relativePath);
            
            const routeWeb = routeBase === "." ? "/" : "/" +  routeBase

            if(route.includes(".static.") || !route.includes("dynamic"))
            {
                if(path.extname(route).includes('html'))
                {
                    this._app.html.static(routeWeb, route);
                }
                else if(path.extname(route).includes('jsx'))
                {

                    this._app.jsx.static(routeWeb, route, this._layout);
                }
            }
            else if(route.includes(".dynamic."))
            {

            }
        })
    }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
  
    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory())
        {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        }
        else
        {
            arrayOfFiles.push(filePath);
        }
    });
  
    return arrayOfFiles;
}

module.exports = Views;