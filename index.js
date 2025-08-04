/// <reference types="./lib/lex-press-dev/types.d.ts" />

/**
 * @type {import("./lib/lex-press-dev/types.d.ts").LexpressDev}
 */
const lexpress = process.argv.includes("--build") ? require("./lib/lex-press-builder") : require("./lib/lex-press-dev");

module.exports = lexpress;