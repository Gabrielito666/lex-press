const { describe, it, test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

describe("Server", () =>
{
    let child_process_production;
    before(async() =>
    {
        await new Promise((resolve, reject) =>{
            const child_process = spawn("node", [path.join(__dirname, "server-to-build.js"), "--build"]);
            child_process.on("close", resolve)
            .on("error", reject);

            child_process.stdout.on("data", (data)=>console.log("build server data:", data.toString()));
            child_process.stderr.on("data", (data)=>console.log("build server error:", data.toString()));
        });

        const existence = fs.existsSync(path.resolve(process.cwd(), ".lexpress-server.js"));
        assert.strictEqual(existence, true);
        
        const child_process_prod = spawn("node", [path.resolve(process.cwd(), ".lexpress-server.js")]);
    
        child_process_prod.stdout.on("data", (data)=>console.log("prod server data:", data.toString()));
        child_process_prod.stderr.on("data", (data)=>console.log("prod server error:", data.toString()));

        child_process_production = child_process_prod;

        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
    });

    after(async() =>
    {
        if(fs.existsSync(path.resolve(process.cwd(), ".lexpress-server.js")))
        {
            fs.unlinkSync(path.resolve(process.cwd(), ".lexpress-server.js"));
        }
        child_process_production.kill();
    });

    

    test("simple endpoint proof", async() =>
    {
        const response = await fetch("http://localhost:3001");
        const text = await response.text();
        assert.strictEqual(text, "Hello World");
    });

    test("static file by public method proof", async() =>
    {
        const response = await fetch("http://localhost:3001/static-file.json");
        const json = await response.json();
        assert.deepStrictEqual(json, {this: {is: "a static file"}});
    });

    test("views html static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-1");
        const text = await response.text();

        assert.ok(text.includes("Hello World"));
    });

    test("views html static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-2");
        const text = await response.text();
        assert.ok(text.includes("Hello World 2"));
    });
    test("views html static 3 proof dynamic tag not processed", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-3");
        const text = await response.text();

        assert.ok(text.includes("__SERVER_PROPS.hello__"));
        assert.ok(text.includes("Hello World 3"));
    });

    test("views html dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-dynamic-1");
        const text = await response.text();

        assert.ok(text.includes("hello world from server"));
    });

    test("views jsx static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-static-1");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
    });

    test("views jsx static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-static-2");
        const text = await response.text();
        assert.ok(text.includes("__SERVER_PROPS.hello__"));
    });

    test("views jsx dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-dynamic-1");
        const text = await response.text();
        assert.ok(text.includes("hello world from server"));
    });

    test("root route proof", async() =>
    {
        const response = await fetch("http://localhost:3001");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
    });

    test("inside route proof", async() =>
    {
        const response = await fetch("http://localhost:3001/inside/route");
        const text = await response.text();
        assert.ok(text.includes("Hello World"));
        assert.ok(text.includes("This is a page inside a route"));
    });
});
