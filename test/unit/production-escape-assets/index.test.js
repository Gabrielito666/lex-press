/**
 * @file
 * @source ./test/unit/production-escape-assets/index.test.js
 * @description Tests unitarios para lib/production-escape-assets
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const escapeAssets = require("#lib/production-escape-assets");

const BASE = "/random-url";

/**
 * Construye un documento html completo en una sola línea (cheerio envuelve
 * fragmentos en html/body al serializar, así que los tests usan estructura fija).
 * @param {string} head
 * @param {string} body
 * @returns {string}
 */
const doc = (head, body) =>
	`<html><head>${head}</head><body>${body}</body></html>`;

describe("escapeAssets", () =>
{
	it("prefija rutas absolutas en img src", () =>
	{
		const html = doc("", '<img src="/__assets/logo.png">');
		assert.equal(escapeAssets(BASE, html), doc("", '<img src="/random-url/__assets/logo.png">'));
	});

	it("prefija rutas relativas sin slash inicial", () =>
	{
		const html = doc("", '<img src="__assets/logo.png">');
		assert.equal(escapeAssets(BASE, html), doc("", '<img src="/random-url/__assets/logo.png">'));
	});

	it("prefija script src, link href y video poster", () =>
	{
		const html = doc(
			'<script src="/__assets/app-abc.js"></script><link rel="stylesheet" href="/__assets/estilos-def.css">',
			'<video poster="/__assets/thumb-ghi.jpg"></video>'
		);
		const expected = doc(
			'<script src="/random-url/__assets/app-abc.js"></script><link rel="stylesheet" href="/random-url/__assets/estilos-def.css">',
			'<video poster="/random-url/__assets/thumb-ghi.jpg"></video>'
		);
		assert.equal(escapeAssets(BASE, html), expected);
	});

	it("prefija todas las urls de un srcset", () =>
	{
		const html = doc("", '<img srcset="/__assets/a-1.png 480w, __assets/b-2.png 1080w">');
		assert.equal(
			escapeAssets(BASE, html),
			doc("", '<img srcset="/random-url/__assets/a-1.png 480w, /random-url/__assets/b-2.png 1080w">')
		);
	});

	it("prefija urls dentro de style inline con y sin comillas", () =>
	{
		const html = doc("", '<div style="background:url(\'/__assets/fondo-1.png\');border-image:url(/__assets/borde-2.png)"></div>');
		assert.equal(
			escapeAssets(BASE, html),
			doc("", '<div style="background:url(\'/random-url/__assets/fondo-1.png\');border-image:url(/random-url/__assets/borde-2.png)"></div>')
		);
	});

	it("prefija fetch() dentro de script inline", () =>
	{
		const html = doc('<script type="module">fetch("/__assets/datos-abc.json");</script>', "");
		assert.equal(
			escapeAssets(BASE, html),
			doc('<script type="module">fetch("/random-url/__assets/datos-abc.json");</script>', "")
		);
	});

	it("prefija url() dentro de style inline", () =>
	{
		const html = doc("<style>.hero{background:url(/__assets/hero-1.png)}</style>", "");
		assert.equal(
			escapeAssets(BASE, html),
			doc("<style>.hero{background:url(/random-url/__assets/hero-1.png)}</style>", "")
		);
	});

	it("no toca texto visible (h1/p/span)", () =>
	{
		const html = doc("", '<h1>estos son mis /__assets</h1><p>ruta __assets/logo.png</p><span>/__assets</span>');
		assert.equal(escapeAssets(BASE, html), html);
	});

	it("no toca URLs absolutas externas ni protocol-relative", () =>
	{
		const html = doc("", '<img src="https://cdn.example.com/__assets/logo.png"><img src="//cdn.example.com/__assets/x.png">');
		assert.equal(escapeAssets(BASE, html), html);
	});

	it("no toca data URIs ni comentarios html", () =>
	{
		const html = doc("", '<img src="data:image/png;base64,AAAA"><!-- /__assets/old.png -->');
		assert.equal(escapeAssets(BASE, html), html);
	});

	it("no toca referencias sin nombre de archivo (/__assets o /__assets/)", () =>
	{
		const html = doc("", '<p data-x="/__assets">a</p><p data-y="/__assets/">b</p>');
		assert.equal(escapeAssets(BASE, html), html);
	});

	it("preserva query y hash en la ruta del asset", () =>
	{
		const html = doc("", '<script src="/__assets/app.js?v=2#x"></script>');
		assert.equal(escapeAssets(BASE, html), doc("", '<script src="/random-url/__assets/app.js?v=2#x"></script>'));
	});

	it("prefija atributos data-*", () =>
	{
		const html = doc("", '<div data-config="/__assets/config.json" data-img="__assets/hero-9.png"></div>');
		assert.equal(
			escapeAssets(BASE, html),
			doc("", '<div data-config="/random-url/__assets/config.json" data-img="/random-url/__assets/hero-9.png"></div>')
		);
	});

	it("normaliza baseUrl con trailing slash", () =>
	{
		const html = doc("", '<img src="/__assets/a.png">');
		assert.equal(escapeAssets("/random-url/", html), doc("", '<img src="/random-url/__assets/a.png">'));
	});

	it("baseUrl raíz o vacío no duplica el slash", () =>
	{
		const html = doc("", '<img src="/__assets/a.png">');
		assert.equal(escapeAssets("/", html), html);
		assert.equal(escapeAssets("", html), html);
	});

	it("devuelve el mismo string si el html no contiene __assets", () =>
	{
		const html = "<html><body><h1>hola mundo</h1></body></html>";
		assert.equal(escapeAssets(BASE, html), html);
	});
});
