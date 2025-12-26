const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
});

module.exports = mongoose.model('1Customer', CustomerSchema);