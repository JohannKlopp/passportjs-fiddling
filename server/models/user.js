const mongoose = require("mongoose");

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
    minlength: 1,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3
  }
});

var User = mongoose.model("User", UserSchema);

module.exports = {User};
