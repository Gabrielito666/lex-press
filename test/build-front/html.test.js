const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { promises: fs } = require('fs');
const path = require('path');
const { load } = require('cheerio');
const buildFRONT = require('#lib/build-front');

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

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);
            
            assert.strictEqual($('title').text(), 'Basic HTML');
            assert.strictEqual($('h1').text(), 'Hello World');
            assert.strictEqual($('script').length, 0); // No scripts should be added
        });

        it('should process HTML with inline module script', async () => {
            const input = path.join(inputsDir, 'with-inline-script.html');

            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            assert.strictEqual($('script').length, 1);
            assert.strictEqual($('script').attr('type'), 'module');
            
            // The bundled script should contain the original code
            const scriptContent = $('script').html();
            assert.ok(scriptContent.includes('console.log'));
            assert.ok(scriptContent.includes('output'));
        });

        it('should process HTML with external script', async () => {
            const input = path.join(inputsDir, 'with-external-script.html');

            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            assert.strictEqual($('script').length, 1);
            assert.strictEqual($('script').attr('type'), 'module');
            
            // The bundled script should contain the external script content
            const scriptContent = $('script').html();
            assert.ok(scriptContent.includes('Hello from external script'));
            assert.ok(scriptContent.includes('greet'));
        });

        it('should process HTML with mixed scripts', async () => {
            const input = path.join(inputsDir, 'mixed-scripts.html');

            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should have exactly one script tag (the bundled one)
            assert.strictEqual($('script').length, 1);
            assert.strictEqual($('script').attr('type'), 'module');
            
            // The bundled script should contain all script contents
            const scriptContent = $('script').html();
            assert.ok(scriptContent.includes('globalVar'));
            assert.ok(scriptContent.includes('Module script executed'));
            assert.ok(scriptContent.includes('Hello from external script'));
        });

        it('should handle HTML with no scripts', async () => {
            const input = path.join(inputsDir, 'no-scripts.html');

            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should have no script tags
            assert.strictEqual($('script').length, 0);
            
            // Should preserve all other content
            assert.strictEqual($('h1').text(), 'No Scripts Here');
            assert.strictEqual($('li').length, 3);
            assert.strictEqual($('style').length, 1);
        });
    });

    describe('Minification', () => {
        it('should minify when minify=true', async () => {
            const input = path.join(inputsDir, 'with-inline-script.html');

            const resultMinified = await buildFRONT.html(input, true);
            const resultNormal = await buildFRONT.html(input, false);

            // Minified version should be smaller
            assert.ok(resultMinified.length < resultNormal.length);

            // Both should have the same structure
            const $min = load(resultMinified);
            const $norm = load(resultNormal);
            
            assert.strictEqual($min('script').length, $norm('script').length);
            assert.strictEqual($min('h1').text(), $norm('h1').text());
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty scripts', async () => {
            const input = path.join(inputsDir, 'empty-script.html');

            // Should not throw error with empty scripts
            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should handle empty scripts gracefully
            assert.strictEqual($('h1').text(), 'Page with Empty Script');
            // Original scripts should be removed (regardless if empty)
            // but no bundled script should be added since there's no content
            const $original = load(await fs.readFile(input, 'utf-8'));
            const $result = load(result);
            assert.strictEqual($original('script').length, 2); // Original had 2 empty scripts
            assert.strictEqual($result('script').length, 0); // All should be removed
        });

        it('should handle complex HTML structure', async () => {
            const input = path.join(inputsDir, 'complex-structure.html');

            const result = await buildFRONT.html(input, false);

            assert.ok(result.includes('<html'));
            assert.ok(result.includes('</html>'));

            const $ = load(result);

            // Should preserve complex structure
            assert.strictEqual($('header nav ul li').length, 2);
            assert.strictEqual($('main article section').length, 2);
            assert.strictEqual($('footer').length, 1);
            
            // Should have bundled script
            assert.strictEqual($('script').length, 1);
            assert.strictEqual($('script').attr('type'), 'module');
            
            const scriptContent = $('script').html();
            // esbuild may transform class syntax, so check for the transformed version
            assert.ok(/class App|var App = class/.test(scriptContent));
            assert.ok(scriptContent.includes('init'));
        });
    });

    describe('Error Handling', () => {
        it('should throw error for non-existent input file', async () => {
            const input = path.join(inputsDir, 'non-existent.html');

            await assert.rejects(buildFRONT.html(input, false));
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

            await assert.rejects(buildFRONT.html(tempInput, false));
        });
    });
});
