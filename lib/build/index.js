const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const build = async() =>
{
    const dist = path.join(process.cwd(), "dist");
    const app = path.join(dist, "app");
    const outputPath = path.join(app, "views.json");

    if(!fs.existsSync(dist)) fs.mkdirSync(dist);
    if(!fs.existsSync(app)) fs.mkdirSync(app);

    fs.writeFileSync(outputPath, JSON.stringify(require("../build-cache")));

    const publicDir = path.resolve(process.cwd(), "public");

    if(fs.existsSync(publicDir))
    {
        execSync("cp -r public dist/app/")
    }
    fs.copyFileSync(path.resolve(process.cwd(), "package.json"), path.join(app, 'package.json'));

    esbuild.build({
        entryPoints: ['./index.js'],
        outfile: './dist/app/index.js',
        minify: true,
        bundle: true,
        platform: 'node',
        target: 'node16',
        sourcemap: false,
        external: ['jsdom', "esbuild", "uglify-js"]
    })
    .then(() =>
    {
        console.log('Build!!');
        process.exit(1);
    })
    .catch((error) => 
    {
        console.error('Build Error:', error);
        process.exit(1);
    });
}
module.exports = build;