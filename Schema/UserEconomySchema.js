const mongoose = require('mongoose');

const userEconomySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastWork: { type: Date },
  isBanned: { type: Boolean, default: false }
});

module.exports = mongoose.model('UserEconomy', userEconomySchema);
