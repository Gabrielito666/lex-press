/**
 * @type {import("./lib/lex-press-dev").LexpressDev}
 */
const lexpress = process.argv.includes("--build") ? require("./lib/lex-press-builder") : require("./lib/lex-press-dev");

module.exports = lexpress;
