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
// these two are for the forgot-password feature
const async = require("async");
const crypto = require("crypto");


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
app.use(session({ secret: "qwyert12 secret sesssssssion key"}));
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

app.post("/signup",async (req, res) => {
  const enteredUsername = req.body.username;
  const enteredEmail = req.body.email;
  const enteredPassword = req.body.password;
  const enteredConfirmP = req.body.confirm;

  const userByUsername = await User.find({username: enteredUsername}).catch((e) => { return console.error(e) });
  let objUserByUsername;
  if (userByUsername.length >= 1) {
    objUserByUsername = userByUsername[0];
    console.error(`The entered username is already in use: ${objUserByUsername.username}`);
    userByUsername.length = 0;
  };

  const userByEmail = await User.find({email: enteredEmail}).catch((e) => { return console.error(e) });
  let objUserByEmail;
  if(userByEmail.length >= 1) {
    objUserByEmail = userByEmail[0];
    console.error(`This email is already in use: ${objUserByEmail.email}`);
    userByEmail.length = 0;
  };

  if(objUserByUsername !== undefined && objUserByEmail !== undefined) {
    return res.render("signup", {
      username: enteredUsername,
      email: enteredEmail
    });
  };

  // All fields empty
  if(!enteredUsername && !enteredEmail && !enteredPassword && !enteredConfirmP) {
    console.error("The user has not entered anything");
    return res.render("signup");
  };
  // 3 fields empty
  if(enteredUsername && !enteredEmail && !enteredPassword && !enteredConfirmP) {
    console.error("The user has not entered anything but a valid username");
    return res.render("signup", {
      username: enteredUsername
    });
  };
  if(!enteredUsername && enteredEmail && !enteredPassword && !enteredConfirmP) {
    console.error("The user has not entered anything but a valid email");
    return res.render("signup", {
      email: enteredEmail
    });
  };
  if(!enteredUsername && !enteredEmail && !enteredPassword && enteredConfirmP) {
    console.error("The user has not entered anything but the confirmPassword");
    return res.render("signup", {
      username: enteredUsername,
      email: enteredEmail
    });
  };
  if(!enteredUsername && !enteredEmail && enteredPassword && !enteredConfirmP) {
    console.error("The user has not entered anything but the 1st password");
    return res.render("signup", {
      username: enteredUsername,
      email: enteredEmail
    });
  };
  // 2 or 3 fields empty
  if(enteredUsername && !enteredEmail && (enteredPassword || enteredConfirmP)) {
    console.error("The user has only entered a valid username and one or both passwords");
    return res.render("signup", {
      username: enteredUsername
    });
  };
  if(!enteredUsername && enteredEmail && (enteredPassword || enteredConfirmP)) {
    console.error("The user has only entered a valid email and one or both passwords");
    return res.render("signup", {
      email: enteredEmail
    });
  };
  // 2 fields empty
  if(!enteredUsername && !enteredEmail && enteredPassword && enteredConfirmP) {
    console.error("The user has entered everything but a username and an email");
    return res.render("signup");
  };
  // 1 or 2 field(s) empty
  if(enteredUsername && enteredEmail && (!enteredPassword || !enteredConfirmP)) {
    console.error("The user has entered everything but one or both passwords");
    return res.render("signup", {
      email: enteredEmail,
      username: enteredUsername
    });
  };
  // 1 field empty
  if(!enteredUsername && enteredEmail && enteredPassword && enteredConfirmP) {
    console.error("The user has entered everything but a username");
    return res.render("signup", {
      email: enteredEmail
    });
  };
  if(enteredUsername && !enteredEmail && enteredPassword && enteredConfirmP) {
    console.error("The user has entered everything but an email");
    return res.render("signup", {
      username: enteredUsername
    });
  };

  if(enteredPassword === enteredConfirmP) {
    // No fields empty, everything valid
    const newUser = new User({
      username: enteredUsername,
      email: enteredEmail,
      password: enteredPassword
    });

    await newUser.save().catch((e) => { return console.error(e) });

    req.login(newUser, (err) => {
      if(err) return console.error(err);
      res.redirect("/secret");
    });
  }
  else {
    console.error("enteredPassword and enteredConfirmP don't match");
    return res.render("signup", {
      username: enteredUsername,
      email: enteredEmail
    });
  };

});

app.get("/forgot", (req, res) => {
  res.render("forgot", {
    user: req.user
  });
});


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
