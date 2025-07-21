import Lex from "@lek-js/lex";
const Layout = ({ children }) =>
{
    return (
        <html>
            <head>
                <title>Test</title>
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}

module.exports = Layout;