const lexpress = require("..");

const app = lexpress();

app.views("./views");
app.public("./public");

app.get("/", (req, res)=> res.redirect("/home"));

app.get("/hello", (req, res)=> res.send("Hello World"));

app.listen(3000, () =>
{
    console.log("Server is running on port 3000");
});