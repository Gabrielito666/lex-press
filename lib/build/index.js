const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const build = async(buildCache) =>
{
    await new PromiseRejectionEvent(res => setInterval(res, 1000)) //TODOOOO
    const dist = path.join(process.cwd(), "dist");
    const app = path.join(dist, "app");
    const outputPath = path.join(app, "views.json");
    const volumes = path.resolve(app, "volumes")

    if(!fs.existsSync(dist)) fs.mkdirSync(dist);
    if(!fs.existsSync(app)) fs.mkdirSync(app);
    if(!fs.existsSync(volumes)) fs.mkdirSync(volumes);

    fs.writeFileSync(outputPath, JSON.stringify(buildCache));

    const publicDir = path.resolve(process.cwd(), "public");

    if(fs.existsSync(publicDir))
    {
        execSync("cp -r public dist/app/")
    }
    fs.copyFileSync(path.resolve(process.cwd(), "package.json"), path.join(app, 'package.json'));
    fs.copyFileSync(path.join(__dirname, "templates", "Dockerfile"), path.join(dist, "Dockerfile"));
    fs.copyFileSync(path.join(__dirname, "templates", "build-docker.sh"), path.join(dist, "build-docker.sh"));
    fs.copyFileSync(path.join(__dirname, "templates", "run-docker.sh"), path.join(dist, "run-docker.sh"));

    esbuild.build({
        entryPoints: ['./index.js'],
        outfile: './dist/app/index.js',
        minify: true,
        bundle: true,
        platform: 'node',
        target: 'node16',
        sourcemap: false,
        external: ['jsdom', "esbuild", "uglify-js", ...process.argv.slice(2) || []]
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