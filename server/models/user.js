// models/user.js
const mongoose = require('mongoose');

module.exports = function createUserModel(connection) {
  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    confirmPassword: String
  });

  return connection.model('User', userSchema); // Name model explicitly
};
