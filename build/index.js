const [_, __, serverEntrypoint] = process.argv;
const child_process = require("child_process");
const buildServer = require("../lib/build-server");

function execPromise(cmd, opts) {
    return new Promise((resolve, reject) => {
        const proc = child_process.exec(cmd, opts, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve({ stdout, stderr });
        });
        // Si quieres heredar la salida en tiempo real:
        if (proc.stdout) proc.stdout.pipe(process.stdout);
        if (proc.stderr) proc.stderr.pipe(process.stderr);
    });
}

execPromise(`BUILD_MODE="true" NODE_ENV="development" node ${serverEntrypoint}`)
.then(() => buildServer(serverEntrypoint))
.then(() => {
    console.log("Server and files built (development)");
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});