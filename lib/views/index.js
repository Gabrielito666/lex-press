const fs = require('fs');
const path = require('path');

/**
 * @class
 */
const Dir = class
{
	/**
	* @param {string} dirname
	* @param {Dir|null} parent
	*/
	constructor(dirname, parent)
	{
		const elements = fs.readdirSync(dirname);

		/**@type {string}*/
		this.dirname = dirname;
		/**@type {Dir|null}*/
		this.parent = parent;
		/**@type {Dir[]}*/
		this.dirs = [];
		/**@type {Page|null}*/
		this.page = null;

		const posibleLayoutPath = path.resolve(dirname, "layout.jsx");
		const posibleServerPropsPath = path.resolve(dirname, "server-props.js");
		const posiblePageHtmlPath = path.resolve(dirname, "page.html");
		const posiblePageJsxPath = path.resolve(dirname, "page.jsx");

		/**@type {string|null}*/
		this.layoutPath = fs.existsSync(posibleLayoutPath) ? posibleLayoutPath : null;
		/**@type {string|null}*/
		this.serverPropsPath = fs.existsSync(posibleServerPropsPath) ? posibleServerPropsPath : null;
		/**@type {string|null}*/
		this.pagePath = fs.existsSync(posiblePageHtmlPath) ? posiblePageHtmlPath : null;

		if(fs.existsSync(posiblePageJsxPath))
		{
			// if there is a page.jsx, it will override the page.html
			this.pagePath = posiblePageJsxPath;
		}

		if(this.pagePath)
		{
			const ext = path.extname(this.pagePath);
			this.page = new Page(
				this.pagePath,
				/**@type {"jsx"|"html"}*/(ext.slice(1)),
				this
			);
		}

		elements.forEach(e =>
		{
			const elementPath = path.resolve(dirname, e);
			const isDir = fs.statSync(elementPath).isDirectory();
			if(isDir)
			{
				this.dirs.push(new Dir(elementPath, this));
				return;
			}
		});
	}

	/**
	 * @param {(file: Page) => void} callback
	 * @returns {void}
	 */
	forEachFile(callback)
	{
		if(this.page) callback(this.page);
		this.dirs.forEach(dir => dir.forEachFile(callback));
	}

	/**
	 * @param {(file: Page) => void} callback
	 * @returns {void}
	 */
	forEachJSXFile(callback)
	{
		if(this.page?.ext === "jsx") callback(this.page);
		this.dirs.forEach(dir => dir.forEachJSXFile(callback));
	}
	/**
	 * @param {(file: Page) => void} callback
	 * @returns {void}
	 */
	forEachHTMLFile(callback)
	{
		if(this.page?.ext === "html") callback(this.page);
		this.dirs.forEach(dir => dir.forEachHTMLFile(callback));
	}
}

/**
 * @class
 */
const Page = class
{
	/**
	 * @param {string} file
	 * @param {"jsx"|"html"} ext
	 * @param {Dir} dir
	 */
	constructor(file, ext, dir)
	{
		this.file = file;
		this.ext = ext;
		this.dir = dir;
	}
	/**
	 * @returns {string|null}
	 */
	get layout()
	{
		const dirRef = { current: this.dir };
		while(true)
		{
			if(dirRef.current.layoutPath)
			{
				return dirRef.current.layoutPath;
			}
			else if(dirRef.current.parent) // if no layout found, go up one level
			{
				dirRef.current = dirRef.current.parent;
			}
			else break; // if no layout found, return null
		}
		return null;
	}
	/**
	 * @returns {string}
	 */
	get route()
	{
		const parentRoutes = [];
		let currentDir = this.dir;
		while(currentDir.parent) //esto no incluye views directory
		{
			parentRoutes.push(path.basename(currentDir.dirname));
			currentDir = currentDir.parent;
		}
		const route = "/" + parentRoutes.reverse().join("/");
		return route;
	}

	/**
	 * @returns {string|null}
	 */
	get serverPropsModule()
	{
		if (!this.dir.serverPropsPath) return null;
		return this.dir.serverPropsPath;
	}
}

const Views = Dir;
module.exports = Views;
