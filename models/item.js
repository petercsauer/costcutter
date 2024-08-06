const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  cost: { type: Number, required: true },
  date: { type: Date, required: true },
  url: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the user
});

module.exports = mongoose.model('Item', itemSchema);