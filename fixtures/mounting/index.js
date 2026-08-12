/**
 * @file
 * @source ./fixtures/mounting/index.js
 * @description Entry del fixture de montaje de sub-apps: app1 registra sus
 * views/public y luego monta app2 en la raíz (app1.use(app2)) y bajo
 * "/app-2" (app1.use("/app-2", app2)). Con "--build" en argv compila el
 * server de producción (el mismo código, con lexpress-builder). El puerto se
 * lee de PORT env para que los tests levanten el server de producción en un
 * puerto efímero.
 */

const { createApps } = require("./apps.js");

const { app1, app2 } = createApps();

app1.use(app2);
app1.use("/app-2", app2);

const port = Number(process.env.PORT ?? 3000);

app1.listen(port, () => { console.log(`escuchando el puerto ${port}`) });
