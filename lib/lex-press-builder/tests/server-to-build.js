const lexpress = require('lex-press');
const path = require("path");

const app = lexpress();

app.get("/", (req, res) =>
{
    res.send("Hello World");
});

app.public(path.join(process.cwd(), "lib", "lex-press-builder", "tests", "public-test"));

app.views(path.join(process.cwd(), "lib", "lex-press-builder", "tests", "views-test"));

app.listen(3001, () =>
{

});