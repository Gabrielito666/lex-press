const fsSync = require("fs");
const path = require('path');
const { buildDev } = require('lex-builder');

const jsxToStaticHtml = async(jsxPath) =>
{
    try
    {
        const dirname = jsxPath.replace(/\//g, "$");
        const dot_lex_dir = path.join(process.cwd(), ".lex");
        const outputDir = path.join(dot_lex_dir, dirname);
        const output = path.join(outputDir, 'index.bundle.html');
        
        if(!fsSync.existsSync(dot_lex_dir)) fsSync.mkdirSync(dot_lex_dir);
        if(!fsSync.existsSync(outputDir)) fsSync.mkdirSync(outputDir);
        
        await buildDev([jsxPath], output);

        return output;
    }
    catch(err)
    {
        throw err;
    }
}
module.exports = jsxToStaticHtml;