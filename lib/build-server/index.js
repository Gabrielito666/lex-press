const esbuild = require('esbuild');
const CONSTS = require('../consts');
const path = require('path');

// Plugin para reemplazar importaciones
const replaceImportPlugin = {
  name: 'replace-lex-press',
  setup(build) {
    build.onResolve({ filter: /^lex-press$/ }, args => {
      return { path: require.resolve('lex-press/production'), namespace: 'file' };
    });
  },
};

const buildServer = entrypoint =>
{
  return esbuild.build({
    entryPoints: [entrypoint],
    bundle: true,
    minify: true,
    outfile: path.resolve(CONSTS.PATHS.DOT_LEX_PRESS, 'server.js'),
    plugins: [replaceImportPlugin],
    format: 'cjs',
    target: ["node22"],
    platform: "node",
  });
}

module.exports = buildServer;