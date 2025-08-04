import { describe, it, expect, test, vi } from 'vitest';
const serverPropsHTML = require('./index.js');

describe('serverPropsHTML', () =>
{
 
    test("server-props-html simple replace", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key__</h1>";
        const serverProps = async(req) => ({ key: "hello world from server" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>hello world from server</h1>");
    });
    test("server-props-html replace with brothers 1", async() =>
    {
        const html = "<h1>Hola: __SERVER_PROPS.key__</h1>";
        const serverProps = async(req) => ({ key: "persona" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola: persona</h1>");
    });
    test("s|erver-props-html replace with brothers 1", async() =>
    {
        const html = "<h1>Hola:__SERVER_PROPS.key__</h1>";
        const serverProps = async(req) => ({ key: "persona" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:persona</h1>");
    });
    test("server-props-html replace with brothers 3", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: "persona" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:persona</h1>");
    });
    test("sync server props", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = { key1: "Hola", key2: "persona" };
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:persona</h1>");
    });
    test("error server props should be trated as empty object", async() =>
    {
        // Mock console.warn to suppress error output during this test
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => {
            throw new Error("Error");
        }
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>:</h1>");
        
        // Restore console.warn
        consoleWarnSpy.mockRestore();
    });
    test("null server props should be trated as empty object", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => null;
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>:</h1>");
    });
    test("undefined server props should be trated as empty object", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => undefined;
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>:</h1>");
    });
    test("null espesific server prop should be trated as empty string", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: null });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:</h1>");
    });
    test("undefined espesific server prop should be trated as empty string", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: undefined });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:</h1>");
    });
    test("not object server props should be trated as empty object", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => "Hola";
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>:</h1>");
    });
    test("escaping html", async() =>
    {
        const html = "<h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: "<script>alert('Hola')</script>" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>Hola:&lt;script&gt;alert(&apos;Hola&apos;)&lt;/script&gt;</h1>");
    });
    test("escaping __SERVER_PROPS string", async() =>
    {
        const html = "<h1>!__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: "hola" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>__SERVER_PROPS.key1__:hola</h1>");
    });
    test("escaping !__SERVER_PROPS string", async() =>
    {
        const html = "<h1>!!__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>";
        const serverProps = async(req) => ({ key1: "Hola", key2: "hola" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe("<h1>!__SERVER_PROPS.key1__:hola</h1>");
    });

    test("not process strings in script tags", async() =>
    {
        const html = `
        <script>
            const key1 = "__SERVER_PROPS.key1__";
            const key2 = "__SERVER_PROPS.key2__";
        </script>
        <h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>
        `;
        const serverProps = async(req) => ({ key1: "Hola", key2: "hola" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe(`
        <script>
            const key1 = "__SERVER_PROPS.key1__";
            const key2 = "__SERVER_PROPS.key2__";
        </script>
        <h1>Hola:hola</h1>
        `);
    });
    test("not process strings in style tags", async() =>
    {
        const html = `
        <style>
            .key1 {
                color: __SERVER_PROPS.key1__;
            }
            .key2 {
                color: __SERVER_PROPS.key2__;
            }
        </style>
        <h1>__SERVER_PROPS.key1__:__SERVER_PROPS.key2__</h1>
        `;
        const serverProps = async(req) => ({ key1: "red", key2: "blue" });
        const result = await serverPropsHTML(html, serverProps);
        expect(result).toBe(`
        <style>
            .key1 {
                color: __SERVER_PROPS.key1__;
            }
            .key2 {
                color: __SERVER_PROPS.key2__;
            }
        </style>
        <h1>red:blue</h1>
        `);
    });
});

/**TODO:
 * 
 * En el futuro hayq ue spoprtar el no escapado de html sanitizado y sin sanitizar.
 * 
 * por ahora solo se soporta el escapado de texto.
 */