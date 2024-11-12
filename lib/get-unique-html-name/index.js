const counter = { current: -1 };

const getUniqueHtmlName = () => 
{
    counter.current++
    return counter.current + ".html"
}
module.exports = getUniqueHtmlName;