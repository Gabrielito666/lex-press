🔴 GRAVE 1 — El build real está ROTO: mkdir sin recursive + init EAGER → ENOENT
lib/lex-press-builder/index.js:54-60:
const localQueue = new BuilderQueue(async() =>
{
    await globalQueue.init;
    await fs.mkdir(outputPublicDir);   // .lex-press-app/0/public
    await fs.mkdir(outputViewsDir);    // .lex-press-app/0/views
    await fs.mkdir(outputAssetsDir);   // .lex-press-app/0/assets
});
Y lib/builder-queue/index.js:32 — el constructor es EAGER:
this.#init = init ? init() : Promise.resolve();
¿Ves el problema? El init del localQueue corre EN EL MOMENTO en que llamas lexpress(), no cuando haces listen(). Y en ese momento:
- globalQueue.init ya corrió al require (creó solo .lex-press-app).
- El padre .lex-press-app/0 NO EXISTE.
- fs.promises.mkdir sin { recursive: true } → ENOENT garantizado.
La promesa del init se rechaza en silencio, los jobs se encadenan a init.then(job) → nunca corren → q.all() rechaza → app.listen → catch → BUILD ERROR + exit(1). pnpm build-fixture falla SIEMPRE en el flujo real.
¿Y por qué los tests pasan? Porque test/unit/lex-press-builder/index.test.js:108 mockea el mkdir como no-op:
const mkdir = t.mock.method(fs.promises, "mkdir", async () => {});
El ENOENT real está enmascarado. El comentario del test "la queue ejecuta los jobs en paralelo... el orden de los mkdir del init no está garantizado" confirma que se vio la competencia, pero nunca se validó el flujo real sin mocks.
Fix mínimo: { recursive: true } en los 3 mkdir (o mkdir previo del tag). No pude correr node (tus reglas), así que la evidencia es análisis — pero es sólida. pnpm build-fixture lo confirma al tiro.
🔴 GRAVE 2 — Chequeo de tags duplicados MUERTO en el builder
lib/lex-press-builder/index.js:32 y :40:
const routesMap = {};
...
if(Object.keys(routesMap).includes(tag)) { throw ... }
routesMap nunca se llena — no hay ningún routesMap[tag] = ... en todo el módulo. El chequeo SIEMPRE pasa, así que dos apps con el mismo tag en un build no lanzan nada y colisionan en .lex-press-app/<tag>. En dev SÍ funciona: lib/lex-press-dev/index.js:42 hace tags.push(tag).
Fix: routesMap[tag] = true después del chequeo.
🟠 MEDIO 3 — <script src="https://cdn..."> revienta el build de html
lib/build-front/index.js:94-98:
const scriptPath = path.resolve(path.dirname(input), s.attribs.src); // "https://cdn..." → ruta local absurda
bundleFiles.push(scriptPath);
Después en la línea 148: fs.readFile(scriptPath) → ENOENT → Promise.all(promises) (línea 134) rechaza → buildFRONT.html LANZA en vez de retornar {error}. En dev agrava el unhandled rejection que ya documentamos (#262); en builder → buildView lanza → build falla. Un <script src="https://cdn..."> (Google Analytics, cualquier CDN) y a la cresta todo.
Bonus: en la línea 116 los scripts clásicos usan path.join(path.dirname(input), s.attribs.src) — y path.join NO respeta el absoluto del segundo argumento (a diferencia de path.resolve). Un src="/lib.js" se resuelve a dirname/lib.js. Inconsistente con la línea 96 que sí usa resolve.
Fix: saltar scripts con src que empiece con http://, https://, // o /, o try/catch alrededor.
🟠 MEDIO 4 — Producción responde a CUALQUIER método HTTP
lib/lex-press-production/index.js:32-47: el middleware de views es app.use((req,res,next) => ...) → un POST a una ruta existente del árbol devuelve 200 con el html. En dev es app.get(route, ...) (solo GET/HEAD). Semántica HTTP rota e inconsistente dev/prod.
Fix: if(req.method !== "GET" && req.method !== "HEAD") return next();
🟠 MEDIO 5 — escapeAssets reescribe texto visible en alt/title/placeholder
lib/production-escape-assets/index.js:53-68: $("*") itera TODOS los atributos de TODOS los elementos. La doc del módulo (línea 7-8) dice "el texto visible nunca se modifica" — pero un alt="nuestro __assets/equipo" (que SÍ es texto visible en accesibilidad) se reescribiría. Los tests cubren texto de elementos (h1/p), pero no atributos de texto. Edge case, pero contradice tu propio contrato.
🟡 BAJOS (edge cases)
6. normalizeRoute bloquea nombres legítimos con .. (lib/production-html-tree/index.js:45): un directorio a..b jamás se sirve. Tradeoff de seguridad aceptable — pero no está documentado ni probado.
7. escapeAssets con baseUrl sin slash inicial (:50): init("random-url") manual produce random-url/__assets/x — ruta relativa rota. Express siempre entrega req.baseUrl con /, pero el contrato no está validado.
8. ../__assets/x en CSS se reescribe mal (:26-29): queda ../random-url/__assets/x. Raro en la práctica (el build genera /__assets), pero incorrecto si ocurre.
9. <link rel="stylesheet" href="estilos.css"> locales no se procesan (lib/build-front/index.js solo toca scripts): el href relativo sobrevive al html compilado y apunta a .lex-press-app/<tag>/views/estilos.css → 404 en producción. O es limitación de diseño (todo va por __assets) o es bug — decisión tuya.
Lo que SÍ está bien (lo verifiqué con cuidado): el orden de middlewares en producción (views → public → __assets), el ETag sha256 fuerte + max-age=0, must-revalidate (Express respeta el ETag manual y hace 304 con If-None-Match), la consistencia entre path.resolve(outputViewsDir, "."+route) del builder y el walk del HTMLTree (rutas / y /ruta1 matchean perfecto), y el guardián del doble replace en escapeAssets (el lookbehind (?<![\w:/]) del segundo paso impide re-tocar lo ya reescrito — bien pensado eso).
¿Partimos con el GRAVE 1? Es el que te está pegando en el flujo real — el resto son de menor calibre. Dime cuál atacamos primero.
