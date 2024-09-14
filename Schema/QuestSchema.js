const mongoose = require('mongoose');

const QuestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  completedQuests: [{ type: String }],
  activeQuest: {
    questId: { type: String },
    progress: { type: Number, default: 0 },
    required: { type: Number },
    reward: { type: Number },
  }
});

module.exports = mongoose.model('Quest', QuestSchema);
