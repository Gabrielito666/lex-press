/**
 * @import {LexpressDevApp, LexpressFn as _LexpressFn} from "#lib/lex-press-dev"
 */
/**
 * @typedef {LexpressDevApp} LexpressApp
 * @typedef {_LexpressFn} LexpressFn
 */

/**
 * @type {_LexpressFn}
 */
const lexpress = process.argv.includes("--build") ? require("#lib/lex-press-builder") : require("#lib/lex-press-dev");

module.exports = lexpress;
