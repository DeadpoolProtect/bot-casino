const mongoose = require('mongoose');

const LotterySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  ticketNumber: { type: String, required: true },
});

module.exports = mongoose.model('Lottery', LotterySchema);
