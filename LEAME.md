# Lex-Press

Este es mi framework para trabajar con archivos HTML o JSX con LEX. Sigue una filosofía minimalista y de control total por parte del usuario. Integra funcionalidades utilitarias de frameworks como Next.js pero integrados a un wrapper de Express.

> **Nota:** Este framework incluye body-parser y cookie-parser configurados por defecto para facilitar el manejo de requests y cookies.

## Instalación

Usa `npm i lex-press` o `npx create-lex-press-app`

La segunda opción simplemente agrega una pequeña configuración inicial.

## Inicialización

Para comenzar, importa lex-press con require y luego instancia una app al igual que como lo harías en Express:

```js
const lexpress = require("lex-press");

const app = lexpress();
```

Ahora tendrás acceso a todos los métodos de Express ya que este framework solo extiende Express:

```js
const lexpress = require("lex-press");

const app = lexpress();

app.get("/", (req, res) => res.send("Hola mundo"));

app.listen(3000, () => {
    console.log("Escuchando en el puerto 3000");
});
```

## Public

Es un método utilitario para servir directorios públicos. Le pasas el path de la carpeta y listo:

```js
app.public("public");
```

## HTML

Es un método que declara una ruta y un HTML para ser servido. En modo desarrollo y build compila el HTML antes de servirlo. En producción espera que ya se haya hecho build:

```js
app.html("/home", "./pages/index.html");
```

Si el HTML incluye scripts src o inline, este se compilará automáticamente resultando en un único HTML con scripts inline.
El bundle del javascript soporta imports de archivos css o module.css, archivos txt, json y files. Por lo que puedes importar imágenes y obtener un src. El css se procesa y se añade a los archivos html inline.

## JSX

Similar a `app.html` pero recibe route, page y layout:

```js
app.jsx("/home", "./pages/layout.jsx", "./pages/page.jsx");
```

Layout debe exportar un componente Layout y Page debe exportar un componente Page:

```jsx
const Layout = ({ children }) =>
{
    return <html>
        <head>
            <title>Mi App</title>
        </head>
        <body>
            {children}
        </body>    
    </html>;
};
export default Layout;
```

```jsx
const Page = () =>
{
    return <h1>Hola mundo</h1>;
};
export default Page;
```

## Views

El método `views` declara una carpeta de enrutamiento automático al estilo de Vite o Next.js:

```js
app.views("./views");
```

```
views/
├── layout.jsx
├── home/
│   └── page.jsx
├── about/
│   └── page.html
└── contact/
    └── page.jsx
```

Un esquema como este serviría los elementos page.

- Si tenemos `page.html`, se sirve directamente
- Si es `.jsx`, se utiliza el layout más próximo retrocediendo en los directorios

### Importante

Los métodos `html`, `jsx` y `views` no son dinámicos, por lo que luego de `listen` ya no tendrán efecto. Esto es porque en producción no hay build por razones de seguridad.

Si deseas crear o quitar rutas luego de `listen`, debes hacerlo como lo harías con Express.

# Desarrollo

El modo por defecto del framework es desarrollo, por lo que puedes ejecutar el servidor de desarrollo simplemente con:

```bash
node index.js
```
o con nodemon para hot-reload

```bash
nodemon --watch ./ --ext js,jsx,ts,tsx,json,html,css --exec "node index.js"
```

# Build

Para compilar el servidor, lo único que debes hacer es añadir la flag `--build` al proceso principal:

```bash
node index.js --build
```

Esto compilará el servidor de producción en `.lex-press-app/server.js`.

Si tu proyecto utiliza librerías no bundleables (sea porque usan binarios o cualquier otro motivo), podemos pasar un listado de dependencias externas:

```bash
node index.js --build --external modulo-externo1 modulo-externo2
```

De hecho puedes utilizar una serie de flags de esbuild en caso de requerir personalizar el export:
- build
- format
- platform
- target
- bundle
- minify
- sourcemap
- treeShaking
- external
- tsconfig

### Importante

Cuidado con usar `__dirname`. Esto compila todo a un bundle por lo que las rutas relativas cambiarían... usa `process.cwd()`.

# Producción

Una vez bundleado, puedes ejecutar tu servidor desde el archivo `.lex-press-app/server.js`:

```bash
node .lex-press-app/server.js
```
La carpeta .lex-press-app además contiene los archivos html compilados, assets y copias de carpetas públicas que hayas anexado al proyecto con `app.public()`. Por lo tanto esta carpeta sola puede contener todo lo necesario en un despliegue que solo utiliza `app.public()` y `app.views()`.

El archivo de servidor se debe ejecutar solo desde fuera de la carpeta.
