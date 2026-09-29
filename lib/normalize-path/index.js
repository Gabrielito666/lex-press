const path = require('path');

/**
 * Normaliza un path a formato relativo estable desde cwd.
 * Convierte paths absolutos o relativos a un formato consistente
 * usando separadores Unix (/) para que sea portable entre sistemas.
 *
 * @param {string} inputPath - Path absoluto o relativo a normalizar
 * @param {string} [cwd=process.cwd()] - Directorio base para la normalización
 * @returns {string} - Path relativo normalizado con separadores Unix
 */
const normalizePath = (inputPath, cwd = process.cwd()) => {
	const resolved = path.resolve(cwd, inputPath);
	const relative = path.relative(cwd, resolved);
	return relative.split(path.sep).join("/");
};

module.exports = normalizePath;
