const lexpress = require('lex-press');
const path = require("path");

const app = lexpress();

app.get("/", (req, res) =>
{
    res.send("Hello World");
});

app.public(path.join(process.cwd(), "test", "lex-press-builder", "public-test"));

app.views(path.join(process.cwd(), "test", "lex-press-builder", "views-test"));

app.listen(3001, () =>
{

});