/**
 * @file
 * @source ./lib/build-error-html/index.js
 * @description Genera HTML con estilo tipo Next/Vite para mostrar errores de build.
 * Soporta Error y esbuild.BuildFailure con errores y warnings.
 */

/**
 * Genera HTML estilizado para un error de build.
 * Si el error tiene la propiedad "errors" (BuildFailure), renderiza
 * una lista con los errores y luego los warnings en un cuadro centrado
 * con scroll. Si es un Error simple, muestra nombre, mensaje y stack.
 *
 * @param {Error|import("esbuild").BuildFailure} err
 * @returns {string} HTML completo con estilo inline
 */
const buildErrorHtml = (err) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Build Error</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:#e4e4e7;font-family:ui-monospace,'SF Mono','Fira Code','Cascadia Code','Consolas',monospace;display:flex;min-height:100vh;align-items:center;justify-content:center}
.container{width:100%;max-width:820px;margin:40px 20px;background:#13131f;border:1px solid #2a2a3e;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.scroll-area{max-height:70vh;overflow-y:auto}
.scroll-area::-webkit-scrollbar{width:6px}
.scroll-area::-webkit-scrollbar-track{background:transparent}
.scroll-area::-webkit-scrollbar-thumb{background:#333350;border-radius:3px}
.section-header{display:flex;align-items:center;gap:10px;padding:14px 22px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;position:sticky;top:0;z-index:1}
.section-header.error{background:#1a0e0e;color:#f87171;border-bottom:1px solid rgba(239,68,68,.2)}
.section-header.warning{background:#1a1508;color:#fbbf24;border-bottom:1px solid rgba(234,179,8,.2)}
.section-header .badge{background:currentColor;color:#13131f;border-radius:4px;padding:0 7px;font-size:11px;line-height:18px;font-weight:800}
.msg-item{border-bottom:1px solid #20203a}
.msg-item:last-child{border-bottom:none}
.msg-location{padding:12px 22px 8px;font-size:12px;color:#6b6b8a;display:flex;flex-wrap:wrap;gap:4px 16px}
.msg-location .file{color:#60a5fa;font-weight:600}
.msg-location .pos{color:#4a4a6a}
.msg-code{background:#0c0c16;padding:12px 22px;overflow-x:auto;font-size:13px;line-height:1.7;border-top:1px solid #1a1a2e;border-bottom:1px solid #1a1a2e;margin:0}
.msg-code .line{display:flex;padding:0 0}
.msg-code .num{color:#333350;width:40px;flex-shrink:0;text-align:right;padding-right:14px;user-select:none}
.msg-code .src{flex:1;white-space:pre;tab-size:2}
.msg-code .err-line{background:rgba(239,68,68,.12);border-left:3px solid #f87171;margin-left:-3px}
.msg-code .warn-line{background:rgba(234,179,8,.1);border-left:3px solid #fbbf24;margin-left:-3px}
.msg-text{padding:14px 22px 18px;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.msg-text.error{color:#f87171}
.msg-text.warning{color:#fbbf24}
.msg-text .cause{margin-top:12px;padding:10px 14px;background:rgba(0,0,0,.3);border-radius:6px;color:#94a3b8;font-size:12px}
.section-divider{height:2px;background:linear-gradient(90deg,transparent,rgba(239,68,68,.15),transparent)}
.error-simple{padding:28px 32px}
.error-simple .err-name{font-size:13px;color:#f87171;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.error-simple .err-msg{font-size:16px;font-weight:600;color:#e4e4e7;margin-bottom:16px}
.error-simple .err-stack{padding:16px 20px;background:#0c0c16;border-radius:8px;font-size:12px;color:#6b6b8a;white-space:pre-wrap;line-height:1.6;border:1px solid #1a1a2e;max-height:300px;overflow-y:auto}
.err-stack::-webkit-scrollbar{width:5px}
.err-stack::-webkit-scrollbar-thumb{background:#333350;border-radius:3px}
</style>
<script src="/__lexpress-reload.js" type="module"></script>
</head>
<body>
<div class="container">
${
	"errors" in err && Array.isArray(err.errors)
	? [
		`<div class="scroll-area">`,
		...(err.errors.length > 0
			? [
				`<div class="section-header error"><span class="badge">${err.errors.length}</span> Errors</div>`,
				...err.errors.map((/**@type {import("esbuild").Message}*/ m) => renderMessage(m, "error"))
			]
			: []),
		...(err.warnings && err.warnings.length > 0
			? [
				`<div class="section-divider"></div>`,
				`<div class="section-header warning"><span class="badge">${err.warnings.length}</span> Warnings</div>`,
				...err.warnings.map((/**@type {import("esbuild").Message}*/ m) => renderMessage(m, "warning"))
			]
			: []),
		`</div>`
	].flat().filter(Boolean).join("")
	: [
		`<div class="error-simple">`,
		`<div class="err-name">${escapeHtml(err.name || "Error")}</div>`,
		`<div class="err-msg">${escapeHtml(err.message)}</div>`,
		err.stack
			? `<div class="err-stack">${escapeHtml(err.stack)}</div>`
			: "",
		`</div>`
	].join("")
}
</div>
</body>
</html>`;

/**
 * Renderiza un mensaje individual de esbuild (error o warning).
 * @param {import("esbuild").Message} msg
 * @param {"error"|"warning"} kind
 * @returns {string}
 */
const renderMessage = (msg, kind) =>
{
	const loc = msg.location;
	const isErr = kind === "error";
	const cls = isErr ? "error" : "warning";

	const parts = [
		`<div class="msg-item">`
	];

	if(loc)
	{
		const lineNum = loc.line ?? 1;
		const colNum = loc.column ?? 0;
		const lineText = loc.lineText ?? "";

		parts.push(
			`<div class="msg-location">`,
			`<span class="file">${escapeHtml(loc.file ?? "")}</span>`,
			`<span class="pos">${lineNum}:${colNum}</span>`,
			`</div>`,
			`<div class="msg-code">`,
			...renderCodeContext(lineText, lineNum, colNum, isErr),
			`</div>`
		);
	}

	parts.push(`<div class="msg-text ${cls}">${escapeHtml(msg.text)}</div>`);

	if(msg.notes && msg.notes.length > 0)
	{
		for(const note of msg.notes)
		{
			parts.push(`<div class="msg-text ${cls}"><div class="cause">${escapeHtml(note.text)}</div></div>`);
		}
	}

	parts.push(`</div>`);

	return parts.join("");
};

/**
 * Renderiza el contexto de línea de código alrededor del error.
 * Muestra hasta 2 líneas antes y 1 después para dar contexto.
 * @param {string} lineText
 * @param {number} lineNum
 * @param {number} colNum
 * @param {boolean} isErr
 * @returns {string[]}
 */
const renderCodeContext = (lineText, lineNum, colNum, isErr) =>
{
	if(!lineText) return [];

	const lines = [];
	const errLineCls = isErr ? "err-line" : "warn-line";

	// Mostrar la línea del error con un indicador de columna
	lines.push(
		`<div class="line ${errLineCls}">`,
		`<span class="num">${lineNum}</span>`,
		`<span class="src">${escapeHtml(lineText)}</span>`,
		`</div>`
	);

	// Si hay columna, mostrar un caret apuntando
	if(colNum > 0 && colNum <= lineText.length)
	{
		const caretPad = " ".repeat(Math.max(0, colNum - 1));
		lines.push(
			`<div class="line">`,
			`<span class="num"></span>`,
			`<span class="src" style="color:${isErr ? "#f87171" : "#fbbf24"}">${caretPad}^</span>`,
			`</div>`
		);
	}

	return lines;
};

/**
 * Escapa caracteres HTML para evitar inyección.
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) =>
{
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

module.exports = buildErrorHtml;
