/**
 * @file
 * @source ./fixtures/build-server/index.js
 * @description Fixture para probar que app.listen() en modo build retorna un
 * http.Server válido y no falla. Verifica que el server tiene address() y que
 * se puede cerrar manualmente antes de que el builder haga process.exit(0).
 */

const lexpress = require("lex-press");
const path = require("path");

const app = lexpress({ tag: "build-server-test" });

app.views(path.resolve(process.cwd(), "fixtures/build-server/views"));

const server = app.listen(0, () =>
{
	const address = server.address();
	console.log(`server address: ${JSON.stringify(address)}`);
	console.log(`server listening: ${server.listening}`);
	server.close(() =>
	{
		console.log("server closed manually");
	});
});
