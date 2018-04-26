//Basic packages
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
// const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
//Security related packages
const nodemailer = require("nodemailer");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt-nodejs");
const async = require("async");
const crypto = require("crypto");

//local authentication via passportjs
passport.use(new localStrategy((username, password, done) => {
  User.findOne({username: username}, (err, userFromDb) => {
    if(err) return done(err);
    if(!userFromDb) return done(null, false, {message: "Incorrect username."});
    userFromDb.comparePassword(password, (err, isMatch) => {
      if(isMatch) {
        return done(null, userFromDb);
      }
      else {
        return done(null, false, {message: "Incorrect password."});
      }
    });
  });
}));

// Staying logged in when navigating between diff pages of the app
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

//Local imports
const {mongoose} = require("./db/mongoose");
const {User} = require("./models/user");

var app = express();

//Middleware
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
// app.use(favicon());
app.use(logger("dev"));
app.use(bodyParser.json()); //only used for/applied to the request body (req.body)
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({ secret: "session secret key"}));
app.use(passport.initialize());
app.use(passport.session());
// app.use(express.static(path.join(__dirname, "public")));

//Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "Express Server",
    user: req.user
  });
});

app.get("/login", (req, res) => {
  res.render("login", {
    user: req.user
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if(err) return next(err)
    if(!user) {
      return res.redirect("/login")
    }
    req.logIn(user, (err) => {
      if(err) return next(err);
      return res.redirect("/");
    });
  })(req, res, next);
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    user: req.user
  });
});

// Server setup
const port = 3000;
app.listen(port, () => {
  console.log(`Started server at port ${port}.`);
});
