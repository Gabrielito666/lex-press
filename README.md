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

This method returns an object with the `serverProps` method. This is a method that allows us to declare a function (sync or async) for serverProps:

```js
app.html("/home", "./pages/index.html").serverProps((req) =>
{
    return {
        title: "Hello world from server"
    };
});
```

```html
<!--./pages/index.html-->
<body>
    <h1>__SERVER_PROPS.title__</h1>
</body>
```

This will replace the placeholder `__SERVER_PROPS.title__` with the `(return value of the serverProps function).title`:

```html
<!--Final result-->
<body>
    <h1>Hello world from server</h1>
</body>
```

This is useful for preprocessed content. Obviously, it should be used carefully to not send sensitive information to the client.

The text will be automatically escaped, so HTML cannot be injected, only plain text.

The function receives `req` in case you want to use it.

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

This method, like the previous one, returns an object with the `serverProps` method:

```js
app.jsx("/home", "./pages/layout.jsx", "./pages/page.jsx").serverProps((req) =>
{
    return {
        title: "Hello world from server"
    };
});
```

```jsx
const Page = () =>
{
    return <h1>__SERVER_PROPS.title__</h1>;
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
    ├── page.jsx
    └── server-props.js
```

A schema like this would serve the page elements.

- If we have `page.html`, it's served directly
- If it's `.jsx`, the closest layout is used by going back through the directories
- If a `server-props.js` file is included, that code will be used server-side as server props argument:

```js
const serverProps = (req) =>
{
    return {
        title: "Hello world from server"
    };
};
module.exports = serverProps;
```

The `page` and `layout` files use ES modules and `server-props.js` use CommonJS.

## Listen

This wraps Express's `listen` but with a previous step. In development mode, it will precompile and serve the resulting files. In production mode, it will serve the files assuming they are already compiled.

### Important

The `html`, `jsx`, and `views` methods are not dynamic, so after `listen` they will no longer have an effect. This is because in production there is no build for security reasons.

If you want to create or remove routes after `listen`, you must do it as you would with Express.

# Development

The default mode of the framework is development, so you can run the development server simply with:

```bash
node index.js
```

I'll soon include the hot-reload function for frontend and backend. For now, the best option is to use nodemon:

```bash
nodemon --watch ./ --ext js,jsx,ts,tsx,json,html,css --exec "node index.js"
```

# Build

To compile the server, all you need to do is add the `--build` flag to the main process:

```bash
node index.js --build
```

This will compile the production server into `.lexpress-server.js`.

If your project uses non-bundleable libraries (whether because they use binaries or any other reason), we can pass a list of external dependencies:

```bash
node index.js --build --external external-module1 external-module2
```

### Important

Be careful using `__dirname`. This compiles everything into a bundle so relative paths would change... use `process.cwd()`.

# Production

Once bundled, you can run your server from the `.lexpress-server` file:

```bash
node .lexpress-server
```

This is a standalone file (unless external modules have been set), so you can isolate it in a container. No other file is needed except the `public` folder. If you use the `public` method, you must keep this folder accessible.