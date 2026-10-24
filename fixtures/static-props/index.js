/**
 * @file
 * @source ./fixtures/static-props/index.js
 * @description Entry del fixture de staticProps: registra la misma vista por los
 * tres canales de staticProps (app.jsx, app.views y app.html), cada uno con un
 * título DISTINTO para identificar qué canal inyectó las props en el html
 * servido. Con "--build" en argv compila el server de producción (el mismo
 * código, vía lexpress-builder). El puerto se lee de PORT env para que los
 * tests lo levanten en un puerto efímero.
 */

const lexpress = require("lex-press");
const path = require("path");

const app = lexpress({ tag: "static-props" });

const viewsPath = path.resolve(process.cwd(), "fixtures/static-props/views");

app.jsx("/static-jsx", path.resolve(viewsPath, "page.jsx"), path.resolve(viewsPath, "layout.jsx"), {
	staticProps: { title: "STATIC-JSX-VIA-APP-JSX" },
});

// app.views registra page.jsx bajo "/" (con layout.jsx como layout).
app.views(viewsPath, { staticProps: { title: "STATIC-JSX-VIA-APP-VIEWS" } });

app.html("/static-html", path.resolve(process.cwd(), "fixtures/static-props/pages/html.html"), {
	staticProps: { title: "STATIC-HTML-VIA-APP-HTML" },
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => { console.log(`escuchando el puerto ${port}`) });
