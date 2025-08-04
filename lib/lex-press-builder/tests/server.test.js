const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
import { describe, it, expect, test, beforeAll, afterAll } from "vitest";

describe("Server", () =>
{
    let child_process_production;
    beforeAll(async() =>
    {
        await new Promise((resolve, reject) =>{
            const child_process = spawn("node", [path.join(__dirname, "server-to-build.js"), "--build"]);
            child_process.on("close", resolve)
            .on("error", reject);

            child_process.stdout.on("data", (data)=>console.log("build server data:", data.toString()));
            child_process.stderr.on("data", (data)=>console.log("build server error:", data.toString()));
        });

        const existence = fs.existsSync(path.resolve(process.cwd(), ".lexpress-server.js"));
        expect(existence).toBe(true);
        
        const child_process_prod = spawn("node", [path.resolve(process.cwd(), ".lexpress-server.js")]);
    
        child_process_prod.stdout.on("data", (data)=>console.log("prod server data:", data.toString()));
        child_process_prod.stderr.on("data", (data)=>console.log("prod server error:", data.toString()));

        child_process_production = child_process_prod;

        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
    });

    afterAll(async() =>
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
        expect(text).toBe("Hello World");
    });

    test("static file by public method proof", async() =>
    {
        const response = await fetch("http://localhost:3001/static-file.json");
        const json = await response.json();
        expect(json).toStrictEqual({this: {is: "a static file"}});
    });

    test("views html static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-1");
        const text = await response.text();

        expect(text).toContain("Hello World");
    });

    test("views html static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-2");
        const text = await response.text();
        expect(text).toContain("Hello World 2");
    });
    test("views html static 3 proof dynamic tag not processed", async() =>
    {
        const response = await fetch("http://localhost:3001/html-static-3");
        const text = await response.text();

        expect(text).toContain("__SERVER_PROPS.hello__");
        expect(text).toContain("Hello World 3");
    });

    test("views html dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/html-dynamic-1");
        const text = await response.text();

        expect(text).toContain("hello world from server");
    });

    test("views jsx static 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-static-1");
        const text = await response.text();
        expect(text).toContain("Hello World");
    });

    test("views jsx static 2 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-static-2");
        const text = await response.text();
        expect(text).toContain("__SERVER_PROPS.hello__");
    });

    test("views jsx dynamic 1 proof", async() =>
    {
        const response = await fetch("http://localhost:3001/jsx-dynamic-1");
        const text = await response.text();
        expect(text).toContain("hello world from server");
    });

    test("root route proof", async() =>
    {
        const response = await fetch("http://localhost:3001");
        const text = await response.text();
        expect(text).toContain("Hello World");
    });

    test("inside route proof", async() =>
    {
        const response = await fetch("http://localhost:3001/inside/route");
        const text = await response.text();
        expect(text).toContain("Hello World");
        expect(text).toContain("This is a page inside a route");
    });
});