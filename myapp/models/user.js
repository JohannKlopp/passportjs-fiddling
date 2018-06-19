const mongoose = require("mongoose");
const securePassword = require("secure-password");
const spw = securePassword();

var UserSchema = new mongoose.Schema({
  username: {
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
    minlength: 1,
    trim: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

UserSchema.pre("save", function (next) {
  var user = this;
  var userPassword = Buffer.from(user.password);

  spw.hash(userPassword, (err, hash) => {
    if(err) return next(err);
    user.password = hash;
    next();
  });
});

UserSchema.methods.verifyPassword = function (candidatePassword, callback) {
  var bufcandidatePassword = Buffer.from(candidatePassword);
  var bufExistingHash = Buffer.from(this.password);

  spw.verify(bufcandidatePassword, bufExistingHash, (err, result) => {
    if(err) return callback(err);

    if(result === securePassword.INVALID_UNRECOGNIZED_HASH) console.error("Invalid and unrecognized hash for this password.");
    if(result === securePassword.INVALID) console.error("Attempted auth with invalid hash. (incorrect password)");
    if(result === securePassword.VALID_NEEDS_REHASH) {
      console.error("Valid hash, but rehashing to improve security.");
      spw.hash(bufcandidatePassword, (err, improvedHash) => {
        if(err) console.error("Authenticated, but rehash unsuccessful this time around.");
        return user.password = improvedHash;
      });
    };

    callback(null, result);
  });
};

var User = mongoose.model("User", UserSchema);

module.exports = {User};
