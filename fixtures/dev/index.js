const lexpress = require("lex-press");
const path = require("path");

const app = lexpress();

app.get("/health", (req, res) => { res.status(200).send("OK") });

const viewsPath = path.resolve(process.cwd(), "fixtures/dev/views");

app.views(viewsPath);

app.listen(3000, () => { console.log("escuchando el puerto 3000") });
