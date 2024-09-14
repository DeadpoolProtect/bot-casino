const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuestSchema = require('../../Schema/QuestSchema');
const UserEconomySchema = require('../../Schema/UserEconomySchema');
const quests = require('../../quests.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_quest')
    .setDescription('Affiche et accomplissez votre quête quotidienne.'),

  async execute(interaction) {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    try {
      const userQuest = await QuestSchema.findOne({ userId: user.id, guildId });
      const userEconomy = await UserEconomySchema.findOne({ userId: user.id, guildId });

      if (!userEconomy) {
        return interaction.reply({ content: 'Vous devez avoir un compte pour accomplir des quêtes.', ephemeral: true });
      }

      const questKeys = Object.keys(quests);
      const randomQuestKey = questKeys[Math.floor(Math.random() * questKeys.length)];
      const selectedQuest = quests[randomQuestKey];

      if (!selectedQuest) {
        return interaction.reply({ content: 'Erreur: Aucune quête valide trouvée.', ephemeral: true });
      }

      if (!userQuest || new Date(userQuest.date).getDate() !== new Date().getDate()) {
        await QuestSchema.findOneAndUpdate(
          { userId: user.id, guildId },
          {
            userId: user.id,
            guildId,
            date: new Date(),
            activeQuest: {
              questId: randomQuestKey,
              progress: 0,
              required: selectedQuest.required,
              reward: selectedQuest.reward,
            }
          },
          { upsert: true }
        );

        return interaction.reply({
          content: `Votre quête quotidienne : **${selectedQuest.description}**\nObjectif : ${selectedQuest.required}\nRécompense : ${selectedQuest.reward} jetons.`,
          ephemeral: true
        });
      }

      const activeQuest = userQuest.activeQuest;
      const activeQuestInfo = quests[activeQuest.questId];

      if (!activeQuestInfo) {
        return interaction.reply({ content: 'Erreur: La quête active est invalide.', ephemeral: true });
      }

      if (activeQuest.progress >= activeQuest.required) {
        userEconomy.balance += activeQuest.reward;
        await userEconomy.save();

        await QuestSchema.findOneAndUpdate(
          { userId: user.id, guildId },
          { $push: { completedQuests: activeQuest.questId }, $unset: { activeQuest: "" } }
        );

        const embed = new EmbedBuilder()
          .setTitle('🎉 Quête Accomplie 🎉')
          .setDescription(`Vous avez terminé votre quête quotidienne et gagné **${activeQuest.reward} jetons** !`)
          .setColor('#00FF00');

        return interaction.reply({ embeds: [embed] });
      } else {
        return interaction.reply({
          content: `Quête en cours : **${activeQuestInfo.description}**\nProgression : ${activeQuest.progress}/${activeQuest.required}`,
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Erreur lors de la gestion des quêtes quotidiennes:', error);
      await interaction.reply({ content: 'Une erreur est survenue lors de la gestion des quêtes quotidiennes.', ephemeral: true });
    }
  },
};
