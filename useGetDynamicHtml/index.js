const fs = require('fs').promises;

const regex = /<dynamic>([\s\S]*?)<\/dynamic>/;

const devDynamicHtmlParse = (html, params) => html
.replace(regex, (_, p1) => params[p1] || '')
.replace('</body>', `<script>const lexpress = { params: ${JSON.stringify(params)}};</script></body>`);

const getDynamicHtmlRecursive = (resolve, reject, html, params, req, res) =>
{
    if(typeof params === 'object')
    {
        const result = devDynamicHtmlParse(html, params);
        resolve(result);
    }
    else if(params instanceof Promise)
    {
        params
        .then(prms => { getDynamicHtmlRecursive(resolve, reject, html, prms) })
        .catch(reject)
    }
    else if(typeof params === 'function')
    {
        getDynamicHtmlRecursive(resolve, reject, html, params(req, res));
    }
    else
    {
        reject(new Error('the dynamic parameters of lexpress.html.dynamic must be of type object, promise resolving to object or asynchronous function returning an object.'));
    }
}

const useGetDynamicHtml = (htmlPath, params) => new Promise((rslv, rjct) =>
{
    fs.readFile(htmlPath, 'utf8')
    .then((html) =>
    {
        const getHtmlFn = (req, res) => new Promise((resolve, reject) =>
        {{
            getDynamicHtmlRecursive(resolve, reject, html, params, req, res);
        }});
        rslv(getHtmlFn);
    }).catch(rjct);    

})
module.exports = useGetDynamicHtml;