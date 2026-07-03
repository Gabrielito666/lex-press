const { describe, it, test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const lexpress = require('#lib/lex-press-dev');

const app = lexpress();

app.get("/", (req, res) =>
{
    res.send("Hello World");
});

app.public(path.join(__dirname, "public-test"));

app.views(path.join(__dirname, "views-test"));

/** @type {import('http').Server|null} */
let server = null;

describe("Server", () =>
{
    before(async() =>
    {
        server = await app.listen(3000);
    });

    after(() =>
    {
        return new Promise((resolve) => server.close(resolve));
    });


    test("simple endpoint proof", async() =>
    {
        const response = await fetch("http://localhost:3000");
        const text = await response.text();
        assert.strictEqual(text, "Hello World");
    });

    test("static file by public method proof", async() =>
    {
        const response = await fetch("http://localhost:3000/static-file.json");
        const json = await response.json();
        assert.deepStrictEqual(json, {this: {is: "a static file"}});
    });

    test("views html static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-1");
        const text = await response.text();

        assert.ok(text.includes("Hello World"));
    });

    test("views html static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-2");
        const text = await response.text();
        assert.ok(text.includes("Hello World 2"));
    });
    test("views html static 3 proof dynamic tag not processed", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-3");
        const text = await response.text();

        assert.ok(text.includes("__SERVER_PROPS.hello__"));
        assert.ok(text.includes("Hello World 3"));
    });

    test("views html dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-dynamic-1");
        const text = await response.text();

        assert.ok(text.includes("hello world from server"));
    });

    test("views jsx static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-static-1");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
    });

    test("views jsx static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-static-2");
        const text = await response.text();
        assert.ok(text.includes("__SERVER_PROPS.hello__"));
    });

    test("views jsx dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-dynamic-1");
        const text = await response.text();
        assert.ok(text.includes("hello world from server"));
    });

    test("root route proof", async() =>
    {
        const response = await fetch("http://localhost:3000");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
    });

    test("inside route proof", async() =>
    {
        const response = await fetch("http://localhost:3000/inside/route");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
        assert.ok(text.includes("This is a page inside a route"));
    });
});
