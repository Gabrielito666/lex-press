/**
 * @type {typeof import("#lib/lex-press-dev")}
 */
const lexpress = process.argv.includes("--build") ? require("#lib/lex-press-builder") : require("#lib/lex-press-dev");

module.exports = lexpress;
