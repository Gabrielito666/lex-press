const [_, __, serverEntrypoint] = process.argv;
const child_process = require("child_process");
const buildServer = require("../lib/build-server");

child_process.exec(`BUILD_MODE="true" NODE_ENV="development" node ${serverEntrypoint}`, { stdio: "inherit" })
.then(() => buildServer(serverEntrypoint))
.then(() =>
{
    console.log("Server and files built (development)");
    process.exit(0);
})
.catch(err =>
{
    console.error(err);
    process.exit(1);
});