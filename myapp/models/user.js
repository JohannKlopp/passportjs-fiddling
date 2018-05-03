const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const securePassword = require("secure-password");

var UserSchema = new mongoose.Schema({
  username: { //username is a "key", A key defines a property in a mongodb document
    type: String,
    required: true,
    unique: true,
    minlength: 1
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
// UserSchema.pre("save", function (next) {
//
//   if(req.body.confirm === req.body.password) {
//
//   }
// });

// hash and salt user's password that was just entered in the form, prior to saving it to the db
// UserSchema.pre("save", function (next) {
//   var user = this; // In the .pre hook, "this" is the document that is about to be saved
//   var SALT_FACTOR = 5;
//   console.log(user);
//   if(!user.isModified("password")) return next();
//
//   bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
//     if(err) return next(err);
//     console.log(user.password);
//     bcrypt.hash(user.password, salt, null, (err, hash) => {
//       if(err) return next(err);
//       user.password = hash;
//       console.log(hash);
//       next();
//     });
//   });
// });

var spw = securePassword();

UserSchema.pre("save", function (next) {
  var user = this;
  var userPassword = Buffer.from(user.password);

  spw.hash(userPassword, (err, hash) => {
    if(err) return next(err);
    user.password = hash;
    next();
  });
});

// password verification when user tries to log in
// UserSchema.methods.comparePassword = function (candidatePassword, callback) {
//   bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
//     if(err) return callback(err);
//     callback(null, isMatch);
//   });
// };

UserSchema.methods.verifyPassword = function (candidatePassword, callback) {
  var bufcandidatePassword = Buffer.from(candidatePassword);
  var bufExistingHash = Buffer.from(this.password);

  spw.verify(bufcandidatePassword, bufExistingHash, (err, result) => {
    if(err) return callback(err);

    if(result === securePassword.INVALID_UNRECOGNIZED_HASH) console.error("Invalid and unrecognized hash for this password.");
    if(result === securePassword.INVALID) console.error("Attempted auth with invalid hash. (incorrect password)");
    // if(result === securePassword.VALID_NEEDS_REHASH) {
    //   console.error("Valid hash, but rehashing to improve security.");
    //   spw.hash(bufcandidatePassword, (err, improvedHash) => {
    //     if(err) console.error("Authenticated, but rehash unsuccessful this time around.");
    //     return user.password = improvedHash;
    //   });
    // };

    callback(null, result);
  });
};

var User = mongoose.model("User", UserSchema);

module.exports = {User};
