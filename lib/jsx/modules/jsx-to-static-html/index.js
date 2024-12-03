const path = require('path');
const { buildDev, build } = require('lex-builder');

const CONSTS = require("../../../consts");
const { getUniqueKeySync } = require("lek-cryptools");

const jsxToStaticHtml = async(jsxPath, layout) =>
{
    try
    {
        const output = path.join(CONSTS.PATHS.DOT_LEX_PRESS, `${getUniqueKeySync()}.bunde.html`);

        if(process.env.BUILD_MODE)  await build(jsxPath, layout, output);    
        else                        await buildDev(jsxPath, layout, output);

        return output;
    }
    catch(err)
    {
        throw err;
    }
}
module.exports = { jsxToStaticHtml };