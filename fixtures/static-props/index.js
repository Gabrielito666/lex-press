/**
 * @file
 * @source ./fixtures/static-props/index.js
 * @description Entry del fixture de staticProps: crea la app con los tres
 * canales (app.jsx, app.views, app.html) y la levanta. Con "--build" en argv
 * compila el server de producción (el mismo código, vía lexpress-builder). El
 * puerto se lee de PORT env para que los tests levanten el server de producción
 * en un puerto efímero.
 */

const { createStaticPropsApps } = require("./apps.js");

const { app } = createStaticPropsApps();

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => { console.log(`escuchando el puerto ${port}`) });
