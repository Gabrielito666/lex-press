const path = require('path');
const fsSync = require('fs');
const getUniqueHtmlName = require('../../../get-unique-html-name');
const { buildHtmlDev, buildHtml } = require('lex-builder');

const scriptsToBundleHtml = async htmlPath =>
{
    try
    {
        const dirname = htmlPath.replace(/\//g, "$");
        const dot_lex_dir = path.join(process.cwd(), ".lex");
        const outputDir = path.join(dot_lex_dir, dirname);
        const output = path.join(outputDir, 'index.bundle.html');

        if(!fsSync.existsSync(dot_lex_dir)) fsSync.mkdirSync(dot_lex_dir);
        if(!fsSync.existsSync(outputDir)) fsSync.mkdirSync(outputDir);
        
        await buildHtmlDev(htmlPath, output);

        return output;
    }
    catch(err)
    {
        throw err;
    }
}

const scriptsToBundleHtmlBuild = async htmlPath =>
{
    try
    {
        const distFolder = path.join(process.cwd(), "dist");
        const appDir = path.join(distFolder, "app");
        const fileName = getUniqueHtmlName();
        const output = path.join(appDir, fileName);
    
        if(!fsSync.existsSync(distFolder)) fsSync.mkdirSync(distFolder);
        if(!fsSync.existsSync(appDir)) fsSync.mkdirSync(appDir);
    
        await buildHtml(htmlPath, output);
        return fileName;
    }
    catch(err)
    {
        throw err;
    }
}

module.exports = { scriptsToBundleHtml, scriptsToBundleHtmlBuild };