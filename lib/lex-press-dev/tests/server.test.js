const lexpress = require('../index.js');
const path = require("path");

const app = lexpress();

app.get("/", (req, res) =>
{
    res.send("Hello World");
});

app.public(path.join(__dirname, "public-test"));

app.views(path.join(__dirname, "views-test"));
const listenPromise = new Promise((resolve, reject) =>
{
    app.listen(3000, () =>
    {
        resolve();
    });
});

const fs = require("fs");
import { describe, it, expect, test, beforeAll, afterAll } from "vitest";

describe("Server", () =>
{

    beforeAll(async() =>
    {
        await listenPromise;
    });


    test("simple endpoint proof", async() =>
    {
        const response = await fetch("http://localhost:3000");
        const text = await response.text();
        expect(text).toBe("Hello World");
    });

    test("static file by public method proof", async() =>
    {
        const response = await fetch("http://localhost:3000/static-file.json");
        const json = await response.json();
        expect(json).toStrictEqual({this: {is: "a static file"}});
    });

    test("views html static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-1");
        const text = await response.text();

        expect(text).toContain("Hello World");
    });

    test("views html static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-2");
        const text = await response.text();
        expect(text).toContain("Hello World 2");
    });
    test("views html static 3 proof dynamic tag not processed", async() =>
    {
        const response = await fetch("http://localhost:3000/html-static-3");
        const text = await response.text();

        expect(text).toContain("__SERVER_PROPS.hello__");
        expect(text).toContain("Hello World 3");
    });

    test("views html dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/html-dynamic-1");
        const text = await response.text();

        expect(text).toContain("hello world from server");
    });

    test("views jsx static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-static-1");
        const text = await response.text();
        expect(text).toContain("Hello World");
    });

    test("views jsx static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-static-2");
        const text = await response.text();
        expect(text).toContain("__SERVER_PROPS.hello__");
    });

    test("views jsx dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3000/jsx-dynamic-1");
        const text = await response.text();
        expect(text).toContain("hello world from server");
    });

    test("root route proof", async() =>
    {
        const response = await fetch("http://localhost:3000");
        const text = await response.text();
        expect(text).toContain("Hello World");
    });

    test("inside route proof", async() =>
    {
        const response = await fetch("http://localhost:3000/inside/route");
        const text = await response.text();
        expect(text).toContain("Hello World");
        expect(text).toContain("This is a page inside a route");
    });
});