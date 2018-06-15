//Basic packages
const express = require("express");
const flash = require("express-flash");
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



//Local imports
const {mongoose} = require("./db/mongoose");
const {User} = require("./models/user");
const {local} = require("./auth/localAuth");
const {ensureAuthenticated} = require("./auth/localAuth");

var app = express();

//Middleware
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
// app.use(favicon());
app.use(logger("dev"));
app.use(bodyParser.json()); //only used for/applied to the request body (req.body)
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({ secret: "secret sesssssssion key"}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// app.use(express.static(path.join(__dirname, "public")));

//Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "WOW"
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/secret",
    failureRedirect: "/login",
  })
);

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});


app.get("/secret", ensureAuthenticated, (req, res) => {
  res.render("secret", {
    user: req.user.username
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

// const validator = require("validator");
// const {body, validationResult} = require("express-validator/check");
// const {sanitizeBody} = require("express-validator/filter");
// const asyncHandler = require("express-async-handler");

app.post("/signup",async (req, res) => {
  var enteredUsername = req.body.username;
  var enteredEmail = req.body.email;
  var enteredPassword = req.body.password;
  var enteredConfirmP = req.body.confirm;
  console.log(enteredEmail);

  console.log("*******");
  const userByEmail = await User.find({email: enteredEmail});
  // console.log(typeof userByEmail);
  console.log(userByEmail);
  if(userByEmail.length >= 1) {
    var objUserByEmail = userByEmail[0];
    console.error(`This email is already in use: ${objUserByEmail.email}`);
    userByEmail.length = 0;
    return res.render("signup", {
      email : objUserByEmail.email
    });
  };

  const userByUsername = await User.find({username: enteredUsername});
  if (userByUsername >= 1) {
    var objUserByUsername = userByUsername[0];
    console.error(`This username is already in use: ${userByUsername.username}`);

    return res.render("signup", {
      username: objUserByUsername.username
    });
  };

  if(!enteredUsername && !enteredEmail && !enteredPassword && !enteredConfirmP) {
    console.error("The user has entered no username, no email, no password nor a confirmPassword");
    return res.render("signup");
  };
  //
  // if(!enteredUsername && !enteredEmail && enteredPassword && enteredConfirmP) {
  //   return console.error("The user has entered everything but a username and an email");
  // };
  //
  // if(!enteredUsername && enteredEmail && enteredPassword && enteredConfirmP) {
  //   return console.error("The user has entered everything but a username");
  // };
  //
  // if(enteredUsername && !enteredEmail && enteredPassword && enteredConfirmP) {
  //   return console.error("The user has entered everything but an email");
  // };
  //
  // if(enteredUsername && enteredEmail && !enteredPassword || !enteredConfirmP) {
  //   return console.error("The user has entered everything but one or both of the password fields");
  // };

  var newUser = new User({
    username: enteredUsername,
    email: enteredEmail,
    password: enteredPassword
  });

  await newUser.save().catch((e) => { return console.error(e) });

  req.login(newUser, (err) => {
    if(err) return console.error(err);
    res.redirect("/secret");
  });
});

app.get("/forgot", (req, res) => {
  res.render("forgot", {
    user: req.user
  });
});

const async = require("async");
const crypto = require("crypto");

// POST /forgot
app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        host:"smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "z4zq6z3elu5ame2h@ethereal.email",
          pass: "APCxZCkJsCJVMVMRSF"
        }
      });
      var mailOptions = {
        from: 'passwordreset@demo.com',
        to: user.email,
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'The following link is valid for 1 hour only. Please click on it, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', `An e-mail has been sent to ${user.email} with further instructions.`);
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get("/reset/:token", (req, res) => {
  User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, (err, user) => {
    if(!user) {
      req.flash("error", "Password reset token is invalid or has expired:");
      return res.redirect("/forgot");
    }
    res.render("reset", {
      user: req.user
    });
  });
});

// POST /reset/:token
app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        host:"smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "z4zq6z3elu5ame2h@ethereal.email",
          pass: "APCxZCkJsCJVMVMRSF"
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

// Server setup
const port = 3000;
app.listen(port, () => {
  console.log(`Started server at port ${port}.`);
});
