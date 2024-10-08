import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// dotenv.config();


// Define a schema for the user
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  time: String,
  date: String,
});

// Create a model for the user
const User = mongoose.model('User', userSchema);

export default User;