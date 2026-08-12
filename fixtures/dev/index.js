/**
 * @file
 * @source ./fixtures/dev/index.js
 * @description Entry del fixture dev: la app principal registra sus views
 * (fixtures/dev/views) y monta una sub-app bajo "/blog" (fixtures/dev/views-blog)
 * para probar assets en una segunda app, tanto en el server de desarrollo como
 * en el de producción (con "--build" en argv compila con lexpress-builder). El
 * puerto se lee de PORT env para que los tests levanten el server en un puerto
 * efímero.
 */

const lexpress = require("lex-press");
const path = require("path");

const app = lexpress({ tag: "dev" });
const blogApp = lexpress({ tag: "blog" });

app.use(lexpress.json());

app.get("/json", (req, res) => { res.json({ ok: true, iAmCool: true }) });

app.get("/health", (req, res) => { res.status(200).send("OK") });

const viewsPath = path.resolve(process.cwd(), "fixtures/dev/views");
const blogViewsPath = path.resolve(process.cwd(), "fixtures/dev/views-blog");

app.views(viewsPath);
blogApp.views(blogViewsPath);

app.use("/blog", blogApp);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => { console.log(`escuchando el puerto ${port}`) });
