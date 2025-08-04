import Lex from '@lek-js/lex';

const Layout = ({ children }) => {
    return (
        <html>
            <head>
                <title>Test Layout</title>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body>
                <header>
                    <h1>Test Site</h1>
                    <nav>
                        <a href="/">Home</a>
                        <a href="/about">About</a>
                    </nav>
                </header>
                <main>
                    {children}
                </main>
                <footer>
                    <p>&copy; 2024 Test Site</p>
                </footer>
            </body>
        </html>
    );
};

export default Layout;