const express = require("express");

//local imports
const {mongoose} = require("./db/mongoose");
const {User} = require("./models/user");

var app = express();

app.get("/", (req, res) => {
  res.send("<h1>Hello Express!</h2>");
});

app.get("/users", () => {

});

const port = 3000;
app.listen(port, () => {
  console.log(`Started server at port ${port}.`);
});
