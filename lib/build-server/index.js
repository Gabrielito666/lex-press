const esbuild = require('esbuild');
const CONSTS = require('../consts');
const path = require('path');

const buildServer = entrypoint =>
{
  return esbuild.build({
    entryPoints: [entrypoint],
    bundle: true,
    minify: true,
    outfile: path.resolve(CONSTS.PATHS.DOT_LEX_PRESS, 'server.js'),
    format: 'cjs',
    target: ["node22"],
    platform: "node",
    external: ["cheerio", "jsdom", "lex-builder", "esbuild"]
  });
}

module.exports = buildServer;