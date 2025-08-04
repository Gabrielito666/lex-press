/**
 * @typedef {import('./types.d.ts').ServerPropsHTML} ServerPropsHTML
 */

/**
 * Escapes HTML characters for security
 */
const escapeHtml = (text) =>
{
    if (text == null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Finds excluded ranges (script and style tags) where replacement should not occur
 */
const findExcludedRanges = (html) =>
{
    const ranges = [];
    const scriptRegex = /<script[^>]*>.*?<\/script>/gis;
    const styleRegex = /<style[^>]*>.*?<\/style>/gis;
    
    const matchRef = { current: null };
    while ((matchRef.current = scriptRegex.exec(html)) !== null)
    {
        ranges.push({ start: matchRef.current.index, end: matchRef.current.index + matchRef.current[0].length });
    }
    
    while ((matchRef.current = styleRegex.exec(html)) !== null)
    {
        ranges.push({ start: matchRef.current.index, end: matchRef.current.index + matchRef.current[0].length });
    }
    
    return ranges.sort((a, b) => a.start - b.start);
};

/**
 * Checks if a position is within any excluded range
 */
const isPositionExcluded = (position, excludedRanges) =>
{
    return excludedRanges.some(range => position >= range.start && position < range.end);
};

/**
 * Replaces text while excluding certain ranges
 */
const replaceExcludingRanges = (html, regex, replacer, excludedRanges) =>
{
    const resultRef = { current: '' };
    const lastIndexRef = { current: 0 };
    const matchRef = { current: null };
    
    regex.lastIndex = 0; // Reset regex
    
    while ((matchRef.current = regex.exec(html)) !== null)
    {
        const matchStart = matchRef.current.index;
        
        // Add text before this match
        resultRef.current += html.slice(lastIndexRef.current, matchStart);
        
        if (!isPositionExcluded(matchStart, excludedRanges))
        {
            // Replace the match
            resultRef.current += replacer(matchRef.current);
        }
        else
        {
            // Keep the original match
            resultRef.current += matchRef.current[0];
        }
        
        lastIndexRef.current = regex.lastIndex;
    }
    
    // Add remaining text after last match
    resultRef.current += html.slice(lastIndexRef.current);
    return resultRef.current;
};

/**@type {ServerPropsHTML} */
const serverPropsHTML = async(html, serverProps, req) =>
{
    // Get server props with error handling
    const props = await (async() =>
    {
        try
        {
            const result = typeof serverProps === "function" ? await serverProps(req) : serverProps;
            
            // Ensure we have a valid object
            if (result === null || result === undefined || typeof result !== 'object')
            {
                return {};
            }
            
            return result;
        }
        catch(err)
        {
            console.warn("Error trying to get server props");
            console.warn(err);
            return {};
        }
    })();

    // Find excluded ranges (script and style tags)
    const excludedRangesRef = { current: findExcludedRanges(html) };

    // Use a temporary placeholder for escaped server props to avoid double processing
    const ESCAPED_PLACEHOLDER = "___ESCAPED_SERVER_PROP___";
    const escapedReplacements = new Map();
    const escapedCounterRef = { current: 0 };

    // First handle escape sequences (!__SERVER_PROPS.key__)
    const escapedRegex = /!(__SERVER_PROPS\.[a-zA-Z0-9_]+__)/g;
    html = replaceExcludingRanges(html, escapedRegex, (match) =>
    {
        const placeholder = `${ESCAPED_PLACEHOLDER}${escapedCounterRef.current}${ESCAPED_PLACEHOLDER}`;
        escapedReplacements.set(placeholder, match[1]);
        escapedCounterRef.current++;
        return placeholder;
    }, excludedRangesRef.current);
    
    // Recalculate excluded ranges after escape processing
    excludedRangesRef.current = findExcludedRanges(html);

    // Then replace actual server props (__SERVER_PROPS.key__)
    const serverPropsRegex = /__SERVER_PROPS\.([a-zA-Z0-9_]+)__/g;
    html = replaceExcludingRanges(html, serverPropsRegex, (match) =>
    {
        const key = match[1];
        const value = props[key];
        return escapeHtml(value);
    }, excludedRangesRef.current);

    // Finally, restore escaped placeholders to their literal values
    for (const [placeholder, literal] of escapedReplacements.entries())
    {
        html = html.replace(placeholder, literal);
    }

    return html;
};

module.exports = serverPropsHTML;