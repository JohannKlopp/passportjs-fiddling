const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const securePassword = require("secure-password");

// local imports
const {User} = require("./../models/user");

//local authentication via passportjs
var local = passport.use(new localStrategy({
  usernameField: "email"
},
(email, password, done) => {
  User.findOne({email: email}, (err, userFromDb) => {
    if(err) return done(err);
    if(!userFromDb) return done(null, false, console.log("At login: incorrect email"));

    userFromDb.verifyPassword(password, (err, result) => {
      if(result === securePassword.VALID) {
        return done(null, userFromDb);
      }
      else {
        return done(null, false, console.log("At login: incorrect password"));
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

// Middleware to check if already authenticated
function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) { return next() };
  res.redirect("/login");
};

module.exports = {
  local: local,
  ensureAuthenticated: ensureAuthenticated
};
