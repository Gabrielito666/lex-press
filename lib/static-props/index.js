/**
 * @file
 * @source ./lib/static-props/index.js
 * @description Public entry point to read the staticProps baked into a page.
 * Browser-safe: it uses no Node builtins, so esbuild can include it in the
 * client bundle. Props arrive through two channels: the
 * <script type="application/json"> injected into the head of the final html
 * (browser channel) and the global assigned as the first statement of Lex's
 * stringCode (SSR channel, where Lex's JSDOM has no script in the document yet).
 */

/**
 * @import { StaticProps } from "#lib/lex-press-dev";
 */

/**
 * Id of the <script type="application/json"> that carries the props payload.
 * @type {string}
 */
const STATIC_PROPS_ID = "__lexpress-static-props__";

/**
 * globalThis property where buildFRONT.jsx bakes the props before the server
 * render.
 * @type {string}
 */
const STATIC_PROPS_GLOBAL = "__LEXPRESS_STATIC_PROPS__";

/**
 * Error thrown when the page provided staticProps through neither channel.
 * @type {string}
 */
const NO_PROPS_ERROR = "[LEX-PRESS STATIC PROPS ERROR]: the page has no staticProps. register the route with { staticProps: ... } to expose them.";

/**
 * Already parsed props: the payload is immutable per build, so it is parsed
 * only once per module.
 * @type {StaticProps|null}
 */
let cached = null;

/**
 * Reads the staticProps of the current page. It tries the DOM first (browser)
 * and then the global (Lex SSR). If there is nothing, the route was not
 * registered with staticProps.
 * @returns {StaticProps}
 */
const getStaticProps = () =>
{
	if(cached)
	{
		return cached;
	}

	if(typeof document !== "undefined")
	{
		const element = document.getElementById(STATIC_PROPS_ID);
		if(element)
		{
			cached = /**@type {StaticProps}*/(JSON.parse(element.textContent ?? ""));
			return cached;
		}
	}

	const globalProps = /**@type {StaticProps|undefined}*/(
		/**@type {StaticProps}*/(globalThis)[STATIC_PROPS_GLOBAL]
	);

	if(globalProps !== undefined)
	{
		cached = globalProps;
		return cached;
	}

	throw new Error(NO_PROPS_ERROR);
};

module.exports = { getStaticProps, STATIC_PROPS_ID, STATIC_PROPS_GLOBAL };
