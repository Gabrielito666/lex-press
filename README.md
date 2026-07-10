# Lex-Press

This is my framework for working with HTML or JSX files with LEX. It follows a minimalist philosophy with full user control. It integrates utility functionalities from frameworks like Next.js but integrated into an Express wrapper.

> **Note:** This framework includes body-parser and cookie-parser configured by default to facilitate request and cookie handling.

## Installation

Use `npm i lex-press` or `npx create-lex-press-app`

The second option simply adds a small initial configuration.

## Initialization

To get started, import lex-press with require and then instantiate an app just like you would in Express:

```js
const lexpress = require("lex-press");

const app = lexpress();
```

Now you'll have access to all Express methods since this framework only extends Express:

```js
const lexpress = require("lex-press");

const app = lexpress();

app.get("/", (req, res) => res.send("Hello world"));

app.listen(3000, () => {
    console.log("Listening on port 3000");
});
```

## Public

It's a utility method for serving public directories. You pass it the folder path and you're done:

```js
app.public("public");
```

## HTML

It's a method that declares a route and an HTML file to be served. In development and build mode, it compiles the HTML before serving it. In production, it expects the build to have already been done:

```js
app.html("/home", "./pages/index.html");
```

If the HTML includes src or inline scripts, it will be automatically compiled resulting in a single HTML with inline scripts.

The JavaScript bundle supports imports of CSS or module.css files, text files, JSON, and files. So you can import images and get a src. CSS is processed and added to the HTML files inline.

## JSX

Similar to `app.html` but receives route, page, and layout:

```js
app.jsx("/home", "./pages/layout.jsx", "./pages/page.jsx");
```

Layout must export a Layout component and Page must export a Page component:

```jsx
const Layout = ({ children }) =>
{
    return <html>
        <head>
            <title>My App</title>
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
    return <h1>Hello world</h1>;
};
export default Page;
```

## Views

The `views` method declares an automatic routing folder in the style of Vite or Next.js:

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

A schema like this would serve the page elements.

- If we have `page.html`, it's served directly
- If it's `.jsx`, the closest layout is used by going back through the directories

### Important

The `html`, `jsx`, and `views` methods are not dynamic, so after `listen` they will no longer have an effect. This is because in production there is no build for security reasons.

If you want to create or remove routes after `listen`, you must do it as you would with Express.

# Development

The default mode of the framework is development, so you can run the development server simply with:

```bash
node index.js
```
or with nodemon for hot-reload

```bash
nodemon --watch ./ --ext js,jsx,ts,tsx,json,html,css --exec "node index.js"
```

# Build

To compile the server, all you need to do is add the `--build` flag to the main process:

```bash
node index.js --build
```

This will compile the production server into `.lex-press-app/server.js`.

If your project uses non-bundleable libraries (whether because they use binaries or any other reason), we can pass a list of external dependencies:

```bash
node index.js --build --external external-module1 external-module2
```

You can also use a series of esbuild flags if you need to customize the export:
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

### Important

Be careful using `__dirname`. This compiles everything into a bundle so relative paths would change... use `process.cwd()`.

# Production

Once bundled, you can run your server from the `.lex-press-app/server.js` file:

```bash
node .lex-press-app/server.js
```
The .lex-press-app folder also contains compiled HTML files, assets, and copies of public folders you've added to the project with `app.public()`. Therefore, this folder alone can contain everything necessary for a deployment that only uses `app.public()` and `app.views()`.

The server file should only be executed from outside the folder.
