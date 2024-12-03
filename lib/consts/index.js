const path = require('path');

const ROOT = process.cwd();
const $cwd = p => path.resolve(ROOT, p);
const CONSTS =
{
    PATHS :
    {
        ROOT,
        DOT_LEX_PRESS : $cwd('.lex-press'),
        CACHE_JSON: $cwd('.lex-press/pages.json')
    }
}
module.exports = CONSTS;