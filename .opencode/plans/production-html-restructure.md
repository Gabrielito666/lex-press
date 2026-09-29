# Plan: Reestructuración de HTML en Producción

## Objetivo

Cambiar la estructura de `.lex-press-app/` para usar una carpeta global de HTMLs compilados con hash SHA y mapeadores por tag, eliminando la dependencia de la estructura de directorios original.

## Nueva Estructura

```
.lex-press-app/
├── html/                          # GLOBAL - HTMLs compilados
│   ├── abc123def456.html         # SHA-256 del contenido
│   └── ...
├── server.js                      # Bundle de producción
└── ${tag}/                        # Por instancia lexpress()
    ├── htmls-map.json            # { "/ruta": "abc123def456" }
    ├── public-map.json           # { "public": "0", "static": "1" }
    ├── views-map.json            # { "views": ["/home", "/about"] }
    ├── public/                    # Carpetas numeradas
    │   ├── 0/
    │   └── 1/
    └── assets/                    # SIN CAMBIOS - Assets por tag
        └── logo-[hash].png
```

## Cambios por Archivo

### 1. `lib/lex-press-builder/index.js`

**Agregar:**
- Import de `crypto` para calcular hashes
- Constante `outputHtmlDir` para la carpeta global de HTMLs
- Función helper `normalizePath(inputPath)` para normalizar paths a formato relativo estable
- Función helper `hashContent(content)` para calcular SHA-256

**Modificar `globalQueue.init`:**
- Crear carpeta `html/` global además de `outputDir`

**Modificar `localQueue.init`:**
- Eliminar creación de `outputViewsDir` (ya no se usa)
- Mantener `outputPublicDir` y `outputAssetsDir`

**Modificar `app.public(publicPath)`:**
- Normalizar `publicPath` con `normalizePath()`
- Guardar en un objeto `publicMap` la relación: `normalizedPath → publicDirsCounter`
- Al final del build, escribir `public-map.json` en `outputTagDir`

**Modificar `app.views(viewsDir)`:**
- Normalizar `viewsDir` con `normalizePath()`
- Guardar en un objeto `viewsMap` la relación: `normalizedPath → []` (array de rutas)
- En `app.html()` y `app.jsx()`, agregar la ruta al array correspondiente
- Al final del build, escribir `views-map.json` en `outputTagDir`

**Modificar `app.html()` y `app.jsx()`:**
- Cambiar `buildView()` para escribir en `html/{hash}.html` en lugar de `{tag}/views/{ruta}/index.html`
- Guardar en un objeto `htmlsMap` la relación: `ruta → hash`
- Al final del build, escribir `htmls-map.json` en `outputTagDir`

**Modificar `app.listen()`:**
- Antes de `buildServer()`, escribir los tres archivos JSON en `outputTagDir`

### 2. `lib/builder-helpers/index.js`

**Modificar `buildView()`:**
- Cambiar firma: recibir `outputHtmlDir` en lugar de `outputViewsDir`
- Calcular hash del HTML compilado
- Escribir en `outputHtmlDir/{hash}.html`
- Retornar el hash para que el builder lo guarde en el map

### 3. `lib/lex-press-production/index.js`

**Eliminar:**
- Import de `HTMLTree`
- Instanciación de `htmlTree`
- Middleware global de serving de HTML
- Lectura síncrona de `publicDir` al inicio

**Agregar:**
- Función helper `normalizePath(inputPath)` (igual que en builder)
- Función helper `normalizeRoute(pathname)` para normalizar rutas de requests

**Modificar `app.views(viewsDir)`:**
- Normalizar `viewsDir` con `normalizePath()`
- Leer `views-map.json` desde `outputTagDir`
- Obtener array de rutas para ese path normalizado
- Leer `htmls-map.json` desde `outputTagDir`
- Para cada ruta:
  - Obtener hash del map
  - Leer `html/{hash}.html` desde `outputDir`
  - Aplicar `escapeAssets(req.baseUrl, html)` en runtime
  - Calcular ETag del HTML escapado
  - Registrar ruta con express: `app.get(route, handler)`

**Modificar `app.public(publicPath)`:**
- Normalizar `publicPath` con `normalizePath()`
- Leer `public-map.json` desde `outputTagDir`
- Obtener nombre de carpeta para ese path normalizado
- Montar `express.static(outputTagDir/public/{carpeta})`

**Modificar `app.html()` y `app.jsx()`:**
- Mantener como no-op (el serving ya se hace en `app.views()`)

**Modificar serving de assets:**
- Mantener igual: `app.use("/__assets/", express.static(assetsDir))`

### 4. `lib/production-html-tree/index.js`

**Eliminar:**
- Archivo completo (ya no se necesita)

### 5. Tests

**`test/integration/mounting.test.js`:**
- Actualizar `getProdLogoBasenames()` para leer de `.lex-press-app/{tag}/assets/` (sin cambios)
- Verificar que los tests de producción sigan pasando con la nueva estructura

**Agregar tests unitarios:**
- Test de `normalizePath()` con paths absolutos y relativos
- Test de `hashContent()` con contenido conocido
- Test de lectura de maps en producción

## Flujo de Build

1. Usuario ejecuta `node index.js --build`
2. Builder crea `.lex-press-app/html/` (global)
3. Por cada tag:
   - Crea `.lex-press-app/{tag}/public/` y `.lex-press-app/{tag}/assets/`
   - `app.public(path)` copia a `public/{N}/` y guarda en `publicMap`
   - `app.views(path)` descubre páginas y registra rutas en `viewsMap`
   - `app.html()`/`app.jsx()` compila HTML, calcula hash, escribe en `html/{hash}.html`, guarda en `htmlsMap`
   - Al final, escribe `htmls-map.json`, `public-map.json`, `views-map.json` en `{tag}/`
4. Builder genera `server.js` con esbuild

## Flujo de Producción

1. Usuario ejecuta `node .lex-press-app/server.js`
2. Production lee maps de `.lex-press-app/{tag}/`
3. `app.views(path)`:
   - Normaliza path
   - Lee `views-map.json` para obtener rutas
   - Lee `htmls-map.json` para obtener hashes
   - Carga HTMLs en memoria
   - Registra rutas con express
4. `app.public(path)`:
   - Normaliza path
   - Lee `public-map.json` para obtener carpeta
   - Monta `express.static`
5. Assets se montan globalmente al inicio

## Consideraciones

- **escapeAssets**: Se aplica en runtime por cada request con el `baseUrl` actual
- **Normalización de paths**: Usa `path.relative(process.cwd(), path.resolve(inputPath))` para paths estables
- **Hash de contenido**: SHA-256 del HTML compilado (sin escapar)
- **Assets**: Sin cambios, se mantienen en `{tag}/assets/`

## Archivos a Modificar

1. `lib/lex-press-builder/index.js`
2. `lib/builder-helpers/index.js`
3. `lib/lex-press-production/index.js`
4. `lib/production-html-tree/index.js` (eliminar)

## Tests a Ejecutar

```bash
npm test
```

Verificar:
- Tests unitarios de builder
- Tests unitarios de production
- Tests de integración de dev server
- Tests de integración de producción compilada
- Tests de montaje de sub-apps
