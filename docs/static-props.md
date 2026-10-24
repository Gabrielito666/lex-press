# staticProps

`staticProps` is configuration that is **immutable per build**: a JSON-serializable object passed when registering routes, baked into the compiled HTML and read on the client with `getStaticProps()`. It lets a library that exports a lexpress app receive configuration from the host, e.g: `app.use(specialApp({ heroTitle: "MY HERO" }))`. It is not per request: if it changes, you rebuild.

## API (defined in `LexpressDevApp`)

```js
app.html(route, page, { staticProps: { title: "..." } });
app.jsx(route, page, layout, { staticProps: { title: "..." } });
app.views(dir, { staticProps: { title: "..." } }); // propagates to every scanned route
```

Allowed: primitives, arrays and nested objects. Forbidden: functions and symbols — they are rejected at serialization time, so the error blows up during build/registration and not in the browser.

## Two sources, one and the same object

1. `globalThis.__LEXPRESS_STATIC_PROPS__` — assigned inside the `stringCode` during the JSX build.
2. `<script id="__lexpress-static-props__" type="application/json">` — payload in the final HTML.

`getStaticProps()` reads **the DOM first and the global as a fallback**, and caches the parse. The reason for that order: the global also ends up embedded inside the inline bundle of the `<script type="module">`, and `escapeAssets` rewrites script text; the props script is excluded, so the clean copy is the DOM one.

## Why the DOM alone is not enough

Lex's builder evaluates the bundle in an empty JSDOM **before** any props script exists (`node_modules/@lek-js/lex/build-lib/build-html/index.js:113-121`), and its `BuildOptions` only accepts `minify` (`build-jsx/index.js:9-11`): neither `define` nor plugins get through. That is why lex-press builds the `stringCode` itself and passes it through `buildHTML.byStringCode(...)`, which is public (`build-html/index.js:103`).

## Actual execution order (hoisting)

`imports` → global assignment → `Lex.mount(...)`. That is why `getStaticProps()` must be called **during render**, not at module top level: with the `standart` template (no layout) the page's `import` runs before the assignment.

## Payload escaping

A single `serializeStaticProps()` feeds both sinks because `\/` is a valid escape in JSON and in JS: `</script` → `<\/script` (case-insensitive) and `U+2028`/`U+2029` escaped. Without it, the inline bundle breaks the HTML.

## Where each piece lives

- `lib/static-props/index.js` (new): dual-source `getStaticProps()` + the `STATIC_PROPS_ID` / `STATIC_PROPS_GLOBAL` constants.
- `package.json` → `exports["./static-props"]`.
- `lib/build-front/index.js`: serializes, validates and injects (html: after `removeLocalScripts` and also in the no-bundle early return; jsx: through `stringCode` + `byStringCode`; without `staticProps` it delegates to `lexBuildHTML.layout/standart` as always).
- `lib/routes-map/index.js`: `IPage.staticProps`.
- `lib/lex-press-dev/index.js` and `lib/lex-press-builder/index.js`: propagate `options.staticProps` into `buildAndServe` / `buildView`, and `app.views` forwards it to its internal `app.jsx`/`app.html` calls. The key is **not added** when it comes in as `undefined`.
- `lib/production-escape-assets/index.js`: skips the element whose `id` is `STATIC_PROPS_ID`.
- `lib/lex-press-production/index.js`: unchanged; it serves the already baked hash and ignores the source arguments (just like it does with `page`/`layout`).

All three modes stay compatible because dev and builder share `buildFRONT`: in production the props are baked **before the hash**, so different props produce different HTML; production only serves statics.

## Why the module is written in CJS

The project convention is CJS on the backend and `.mjs` on the frontend. `lib/static-props/index.js`
is client-imported code, yet it is deliberately CJS, because **what resolves
`import { getStaticProps } from "lex-press/static-props"` is esbuild during the view build**
(`buildFRONT.html` / `buildFRONT.jsx`), not Node or the browser: esbuild packages the CJS module and
exposes its keys as ESM bindings, so the named-import works without any ESM file existing.
Node ESM, if someone imports it outside the bundle, does the same thing through `cjs-module-lexer`, which
recognizes `module.exports = { getStaticProps, ... }` as an object literal.

At browser runtime a `require` never runs: everything ends up inline in the page's
`<script type="module">`. That is why the subpath `exports` uses `require` + `default` and needs no `import`
condition.

**Constraint to respect**: the named-import keeps working as long as the export is an object
literal. If it changes to `Object.assign(module.exports, ...)`, dynamic spread or conditional
assignments, esbuild and `cjs-module-lexer` lose the names and we would have to switch to a default-import
or rewrite the module as ESM.

## Why the id lives in the client module

`STATIC_PROPS_ID` (`"__lexpress-static-props__"`) and `STATIC_PROPS_GLOBAL` (`"__LEXPRESS_STATIC_PROPS__"`)
are defined in `lib/static-props/index.js:20,27` — the same module the client imports — and the backend
reuses them by importing them: `lib/build-front/index.js:6` (payload injection) and
`lib/production-escape-assets/index.js:12` (payload skip).

They are **just strings**, so splitting them into their own file (`lib/static-props-ids/`,
`constants.js`) is not worth it: it would cost a new directory, another entry in `#lib/*` and, in the second
case, a subpath in `exports`, gaining nothing because there is no state, no logic and no dependencies to isolate.

Importing that module from both sides has no effect on either one either:

- The module's top level only declares constants and a `let cached = null`; it touches neither `document` nor
  `globalThis` until `getStaticProps()` is called. Requiring it in Node is inert.
- `esbuild` tree-shakes in both bundlers (`buildServer` and `buildFRONT.html`): where only the constant is
  consumed, `getStaticProps` and its cache stay out of the output.
- The cache is per module instance inside each bundle, and every page carries its own inline
  `<script type="module">`: there is no shared state between routes, nor between server and client.

The real benefit is the **single source of truth**: if the id name changes, the injection and the
`escapeAssets` skip change together. With the literal copied by hand on each side, a rename would produce
a silent bug — the payload is injected with one id and read/skipped with another.
