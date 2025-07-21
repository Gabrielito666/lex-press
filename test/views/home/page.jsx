import Lex from "@lek-js/lex";

const Counter = () =>
{
    const [count, setCount] = Lex.useState(0);

    return (
        <div>
            <h1>Counter</h1>
            <p>{count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}

const Home = () =>
{
    return <Counter />;
}

module.exports = Home;