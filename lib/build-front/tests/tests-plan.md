# Plan de Tests para build-front

## Análisis del Módulo

### buildFRONT.html
**Funcionalidad**: Procesa archivos HTML bundleando scripts inline y externos usando esbuild con virtual modules.

**Proceso**:
1. Lee archivo HTML de entrada
2. Encuentra scripts `<script type="module">` y `<script>` (sin type)
3. Para scripts con `src`: lee el archivo y lo agrega al bundle
4. Para scripts inline: usa virtual modules de esbuild
5. Combina todos los scripts en un solo bundle usando esbuild
6. Remueve todos los scripts originales del HTML
7. Inserta el bundle como un solo `<script type="module">`
8. Escribe el HTML resultante

### buildFRONT.jsx
**Funcionalidad**: Wrapper para `@lek-js/lex/build-html` que procesa archivos JSX.

**Proceso**:
1. Si hay layout: usa `lexBuildHTML.layout()`
2. Sin layout: usa `lexBuildHTML.standart()`
3. Retorna el path del archivo generado

## Tests a Desarrollar

### 1. buildFRONT.html - Tests Básicos
- ✅ **html-basic**: HTML simple sin scripts
- ✅ **html-single-script-inline**: Un script inline tipo module
- ✅ **html-single-script-src**: Un script externo tipo module
- ✅ **html-mixed-scripts**: Scripts inline + externos, module + normales
- ✅ **html-no-scripts**: HTML sin scripts (caso edge)

### 2. buildFRONT.html - Tests de Minificación
- ✅ **html-minify-true**: Verificar que minify=true reduce el tamaño
- ✅ **html-minify-false**: Verificar que minify=false mantiene formato

### 3. buildFRONT.html - Tests de Edge Cases
- ✅ **html-empty-script**: Script vacío
- ✅ **html-script-with-attributes**: Scripts con atributos adicionales
- ✅ **html-nested-html**: HTML complejo con estructura anidada

### 4. buildFRONT.html - Tests de Error
- ✅ **html-invalid-src**: Script con src inexistente
- ✅ **html-invalid-input**: Archivo HTML inexistente

### 5. buildFRONT.jsx - Tests Básicos
- ✅ **jsx-with-layout**: JSX con layout
- ✅ **jsx-without-layout**: JSX sin layout

### 6. buildFRONT.jsx - Tests de Error
- ✅ **jsx-invalid-page**: Archivo JSX inexistente
- ✅ **jsx-invalid-layout**: Layout inexistente

## Estructura de Archivos

```
lib/build-front/tests/
├── tests-plan.md
├── inputs/
│   ├── html/
│   │   ├── basic.html
│   │   ├── with-inline-script.html
│   │   ├── with-external-script.html
│   │   ├── mixed-scripts.html
│   │   ├── no-scripts.html
│   │   ├── empty-script.html
│   │   ├── complex-structure.html
│   │   └── external-script.js
│   └── jsx/
│       ├── simple-page.jsx
│       └── layout.jsx
├── outputs/
│   └── (archivos generados durante tests)
├── html.test.js
└── jsx.test.js
```

## Metodología de Testing

1. **Setup**: Crear archivos de entrada necesarios
2. **Execution**: Ejecutar función con diferentes parámetros
3. **Verification**: 
   - Verificar que el archivo output existe
   - Verificar contenido del output usando cheerio
   - Verificar que scripts fueron bundleados correctamente
   - Verificar comportamiento de minificación
4. **Cleanup**: Limpiar archivos temporales generados

## Herramientas
- **vitest**: Framework de testing
- **cheerio**: Para parsear y verificar HTML
- **fs.promises**: Para verificar archivos generados
- **path**: Para manejar rutas de archivos