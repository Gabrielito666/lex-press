const Head = ({ children }) =>
{
    const head = document.querySelector("head");

    children.forEach(ch => head.appendChild(ch));

    //algo así
}