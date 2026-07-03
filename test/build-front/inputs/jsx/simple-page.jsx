import Lex from '@lek-js/lex';

const SimplePage = () => {
    return (
        <html>
            <head>
                <title>Simple JSX Page</title>
                <meta charset="UTF-8" />
            </head>
            <body>
                <div>
                    <h1>Simple JSX Page</h1>
                    <p>This is a basic JSX component for testing.</p>
                    <button onClick={() => alert('Hello!')}>
                        Click Me
                    </button>
                </div>
            </body>
        </html>
    );
};

export default SimplePage;