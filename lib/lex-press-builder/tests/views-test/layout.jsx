import Lex from "@lek-js/lex";

const Layout = ({children}) =>
{
    return <html>
        <head>
            <title>Layout</title>
        </head>
        <body>
            {children}
        </body>
    </html>;
}

export default Layout;