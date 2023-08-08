var express = require("express");
var fortune = require("./lib/fortune.js");
var app = express();

// Set up handlebar view engine

var handlebars = require("express3-handlebars").create({
  defaultLayout: "main",
});
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.set("port", process.env.PORT || 3000);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about", { fortune: fortune.getFortune() });
});

// Custom 404 page
app.use((req, res) => {
  res.status(404);
  res.render("404");
});

// Custom 500 page
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500);
  res.render("500");
});

app.listen(app.get("port"), () => {
  console.log(`Express started on https://localhost${app.get("port")}`);
});
