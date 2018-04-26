const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");

var UserSchema = new mongoose.Schema({
  username: { //username is a "key", A key defines a property in a mongodb document
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1
  },
  password: {
    type: String,
    required: true,
    minlength: 3
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// On Sign up, check if "password" and "confirm password" are equal
UserSchema.pre("save", function (next) {

  if(req.body.confirm === req.body.password) {

  }
});

// hash and salt user's password (s)he just entered in the form, prior to saving it to the db
UserSchema.pre("save", function (next) {
  var user = this; // In the .pre hook, "this" is the document that is about to be saved
  var SALT_FACTOR = 5;

  if(!user.isModified("password")) return next();

  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if(err) return next(err);
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if(err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// password verification when user tries to sign in
UserSchema.methods.comparePassword = function (candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if(err) return callback(err);
    callback(null, isMatch);
  });
};

var User = mongoose.model("User", UserSchema);

module.exports = {User};
