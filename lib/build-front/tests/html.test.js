import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'cheerio';
const buildFRONT = require('../index.js');

const testsDir = path.resolve(__dirname);
const inputsDir = path.join(testsDir, 'inputs', 'html');
const outputsDir = path.join(testsDir, 'outputs');

describe('buildFRONT.html', () => {
    beforeEach(async () => {
        // Ensure outputs directory exists
        try {
            await fs.mkdir(outputsDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }
    });

    afterEach(async () => {
        // Clean up output files after each test
        try {
            const files = await fs.readdir(outputsDir);
            await Promise.all(
                files.map(file => fs.unlink(path.join(outputsDir, file)).catch(() => {}))
            );
        } catch (err) {
            // Directory might not exist or be empty
        }
    });

    describe('Basic HTML Processing', () => {
        it('should process basic HTML without scripts', async () => {
            const input = path.join(inputsDir, 'basic.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);
            
            expect($('title').text()).toBe('Basic HTML');
            expect($('h1').text()).toBe('Hello World');
            expect($('script').length).toBe(0); // No scripts should be added
        });

        it('should process HTML with inline module script', async () => {
            const input = path.join(inputsDir, 'with-inline-script.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            expect($('script').length).toBe(1);
            expect($('script').attr('type')).toBe('module');
            
            // The bundled script should contain the original code
            const scriptContent = $('script').html();
            expect(scriptContent).toContain('console.log');
            expect(scriptContent).toContain('output');
        });

        it('should process HTML with external script', async () => {
            const input = path.join(inputsDir, 'with-external-script.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            expect($('script').length).toBe(1);
            expect($('script').attr('type')).toBe('module');
            
            // The bundled script should contain the external script content
            const scriptContent = $('script').html();
            expect(scriptContent).toContain('Hello from external script');
            expect(scriptContent).toContain('greet');
        });

        it('should process HTML with mixed scripts', async () => {
            const input = path.join(inputsDir, 'mixed-scripts.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            expect($('script').length).toBe(1);
            expect($('script').attr('type')).toBe('module');
            
            // The bundled script should contain all script contents
            const scriptContent = $('script').html();
            expect(scriptContent).toContain('globalVar');
            expect(scriptContent).toContain('Module script executed');
            expect(scriptContent).toContain('Hello from external script');
        });

        it('should handle HTML with no scripts', async () => {
            const input = path.join(inputsDir, 'no-scripts.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should have no script tags
            expect($('script').length).toBe(0);
            
            // Should preserve all other content
            expect($('h1').text()).toBe('No Scripts Here');
            expect($('li').length).toBe(3);
            expect($('style').length).toBe(1);
        });
    });

    describe('Minification', () => {
        it('should minify when minify=true', async () => {
            const input = path.join(inputsDir, 'with-inline-script.html');

            const resultMinified = await buildFRONT.html(input, true);
            const resultNormal = await buildFRONT.html(input, false);

            // Minified version should be smaller
            expect(resultMinified.length).toBeLessThan(resultNormal.length);

            // Both should have the same structure
            const $min = load(resultMinified);
            const $norm = load(resultNormal);
            
            expect($min('script').length).toBe($norm('script').length);
            expect($min('h1').text()).toBe($norm('h1').text());
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty scripts', async () => {
            const input = path.join(inputsDir, 'empty-script.html');

            // Should not throw error with empty scripts
            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should handle empty scripts gracefully
            expect($('h1').text()).toBe('Page with Empty Script');
            // Original scripts should be removed (regardless if empty)
            // but no bundled script should be added since there's no content
            const $original = load(await fs.readFile(input, 'utf-8'));
            const $result = load(result);
            expect($original('script').length).toBe(2); // Original had 2 empty scripts
            expect($result('script').length).toBe(0); // All should be removed
        });

        it('should handle complex HTML structure', async () => {
            const input = path.join(inputsDir, 'complex-structure.html');

            const result = await buildFRONT.html(input, false);

            expect(result).toContain('<html');
            expect(result).toContain('</html>');

            const $ = load(result);

            // Should preserve complex structure
            expect($('header nav ul li').length).toBe(2);
            expect($('main article section').length).toBe(2);
            expect($('footer').length).toBe(1);
            
            // Should have bundled script
            expect($('script').length).toBe(1);
            expect($('script').attr('type')).toBe('module');
            
            const scriptContent = $('script').html();
            // esbuild may transform class syntax, so check for the transformed version
            expect(scriptContent).toMatch(/class App|var App = class/);
            expect(scriptContent).toContain('init');
        });
    });

    describe('Error Handling', () => {
        it('should throw error for non-existent input file', async () => {
            const input = path.join(inputsDir, 'non-existent.html');

            await expect(buildFRONT.html(input, false)).rejects.toThrow();
        });

        it('should throw error for script with non-existent src', async () => {
            // Create a temporary HTML file with invalid script src
            const tempInput = path.join(outputsDir, 'temp-invalid-src.html');
            
            const invalidHtml = `
                <!DOCTYPE html>
                <html>
                <head><title>Invalid Script</title></head>
                <body>
                    <script type="module" src="./non-existent-script.js"></script>
                </body>
                </html>
            `;
            
            await fs.writeFile(tempInput, invalidHtml);

            await expect(buildFRONT.html(tempInput, false)).rejects.toThrow();
        });
    });
});