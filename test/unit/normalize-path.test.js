const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const normalizePath = require("#lib/normalize-path");

describe("normalizePath", () => {
	it("path relativo simple", () => {
		const result = normalizePath("public");
		assert.strictEqual(result, "public");
	});

	it("path relativo con ./", () => {
		const result = normalizePath("./public");
		assert.strictEqual(result, "public");
	});

	it("path absoluto se convierte a relativo", () => {
		const absolutePath = path.resolve(process.cwd(), "public");
		const result = normalizePath(absolutePath);
		assert.strictEqual(result, "public");
	});

	it("path con subdirectorios", () => {
		const result = normalizePath("src/public/assets");
		assert.strictEqual(result, "src/public/assets");
	});

	it("path con .. se resuelve", () => {
		const result = normalizePath("public/../static");
		assert.strictEqual(result, "static");
	});

	it("path fuera de cwd", () => {
		const result = normalizePath("../otro");
		assert.strictEqual(result, "../otro");
	});

	it("path vacío retorna string vacío", () => {
		const result = normalizePath("");
		assert.strictEqual(result, "");
	});

	it("path absoluto complejo se normaliza", () => {
		const absolutePath = path.resolve(process.cwd(), "src/views/pages");
		const result = normalizePath(absolutePath);
		assert.strictEqual(result, "src/views/pages");
	});

	describe("portabilidad", () => {
		it("mismo path relativo con diferentes cwd normaliza igual", () => {
			const result1 = normalizePath("public", "/home/dev/proyecto");
			const result2 = normalizePath("public", "/var/www/app");
			assert.strictEqual(result1, "public");
			assert.strictEqual(result2, "public");
		});

		it("path absoluto normaliza igual si la estructura relativa es igual", () => {
			const result1 = normalizePath("/home/dev/proyecto/public", "/home/dev/proyecto");
			const result2 = normalizePath("/var/www/app/public", "/var/www/app");
			assert.strictEqual(result1, "public");
			assert.strictEqual(result2, "public");
		});

		it("path con subdirectorios es consistente entre diferentes cwd", () => {
			const result1 = normalizePath("src/public/assets", "/home/dev/proyecto");
			const result2 = normalizePath("src/public/assets", "/var/www/app");
			assert.strictEqual(result1, "src/public/assets");
			assert.strictEqual(result2, "src/public/assets");
		});

		it("path relativo con ./ es consistente entre diferentes cwd", () => {
			const result1 = normalizePath("./public", "/home/dev/proyecto");
			const result2 = normalizePath("./public", "/var/www/app");
			assert.strictEqual(result1, "public");
			assert.strictEqual(result2, "public");
		});

		it("path con .. se resuelve igual independientemente del cwd", () => {
			const result1 = normalizePath("public/../static", "/home/dev/proyecto");
			const result2 = normalizePath("public/../static", "/var/www/app");
			assert.strictEqual(result1, "static");
			assert.strictEqual(result2, "static");
		});

		it("path fuera de cwd es consistente entre diferentes cwd", () => {
			const result1 = normalizePath("../otro", "/home/dev/proyecto");
			const result2 = normalizePath("../otro", "/var/www/app");
			assert.strictEqual(result1, "../otro");
			assert.strictEqual(result2, "../otro");
		});

		it("simula build en un cwd y producción en otro cwd", () => {
			const buildCwd = "/home/dev/proyecto";
			const prodCwd = "/var/www/app";

			const buildNormalized = normalizePath("public", buildCwd);
			const prodNormalized = normalizePath("public", prodCwd);

			assert.strictEqual(buildNormalized, prodNormalized);
			assert.strictEqual(buildNormalized, "public");
		});

		it("simula build con path absoluto y producción con path relativo", () => {
			const buildCwd = "/home/dev/proyecto";
			const prodCwd = "/var/www/app";

			const buildNormalized = normalizePath("/home/dev/proyecto/public", buildCwd);
			const prodNormalized = normalizePath("public", prodCwd);

			assert.strictEqual(buildNormalized, prodNormalized);
			assert.strictEqual(buildNormalized, "public");
		});
	});
});
