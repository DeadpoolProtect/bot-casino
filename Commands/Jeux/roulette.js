const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');
const QuestSchema = require('../../Schema/QuestSchema');
const quests = require('../../quests.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Jouez à la roulette et pariez sur un numéro ou une couleur.')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à parier.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('pari')
        .setDescription('Pariez sur une couleur (rouge, noir) ou un numéro (0-36).')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const bet = interaction.options.getInteger('mise');
    const choice = interaction.options.getString('pari').toLowerCase();

    const validColors = ['rouge', 'noir'];
    const validNumbers = Array.from({ length: 37 }, (_, i) => i.toString());

    if (!validColors.includes(choice) && !validNumbers.includes(choice)) {
      return interaction.reply({ content: 'Veuillez choisir une couleur (rouge, noir) ou un numéro entre 0 et 36.', ephemeral: true });
    }

    try {
      let userEconomy = await UserEconomySchema.findOne({ userId, guildId });

      if (!userEconomy) {
        userEconomy = new UserEconomySchema({
          userId,
          guildId
        });
        await userEconomy.save();
      }

      if (userEconomy.isBanned) {
        return interaction.reply({ content: 'Vous êtes banni du casino et ne pouvez pas jouer.', ephemeral: true });
      }

      if (userEconomy.balance < bet) {
        return interaction.reply({ content: 'Vous n\'avez pas assez de jetons pour parier cette somme.', ephemeral: true });
      }

      const rouletteNumber = Math.floor(Math.random() * 37);
      const rouletteColor = rouletteNumber === 0 ? 'vert' : (Math.random() < 0.5 ? 'rouge' : 'noir');

      let result = '';
      let wonAmount = 0;

      if (choice === rouletteColor) {
        result = `La roulette a tiré ${rouletteNumber} (${rouletteColor}). Vous avez parié sur ${choice} et vous gagnez!`;
        wonAmount = bet * 2;
        userEconomy.balance += wonAmount;
      } else if (choice === rouletteNumber.toString()) {
        result = `La roulette a tiré ${rouletteNumber}. Vous avez parié sur ${choice} et vous avez gagné le jackpot!`;
        wonAmount = bet * 36;
        userEconomy.balance += wonAmount;
      } else {
        result = `La roulette a tiré ${rouletteNumber} (${rouletteColor}). Vous avez perdu.`;
        userEconomy.balance -= bet;
      }

      await userEconomy.save();

      const userQuest = await QuestSchema.findOne({ userId, guildId });
      if (userQuest && userQuest.activeQuest && quests[userQuest.activeQuest.questId]) {
        const activeQuest = userQuest.activeQuest;
        const questInfo = quests[activeQuest.questId];

        if (questInfo.type === 'roulette' && activeQuest.progress < activeQuest.required) {
          activeQuest.progress += bet;
          if (activeQuest.progress >= activeQuest.required) {
            activeQuest.progress = activeQuest.required;
            await interaction.followUp({
              content: `🎉 Vous avez accompli votre quête quotidienne : **${questInfo.description}** et gagné **${questInfo.reward} jetons** !`,
              ephemeral: true
            });

            userEconomy.balance += questInfo.reward;
            await userEconomy.save();
            await QuestSchema.findOneAndUpdate(
              { userId, guildId },
              { $push: { completedQuests: activeQuest.questId }, $unset: { activeQuest: "" } }
            );
          } else {
            await QuestSchema.findOneAndUpdate(
              { userId, guildId },
              { $set: { 'activeQuest.progress': activeQuest.progress } }
            );
            await interaction.followUp({
              content: `Quête en cours : **${questInfo.description}**\nProgression : ${activeQuest.progress}/${activeQuest.required}`,
              ephemeral: true
            });
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Résultat de la Roulette')
        .setDescription(`**Résultat :** ${rouletteNumber} (${rouletteColor})\n**Votre pari :** ${choice}\n**${result}**`)
        .setColor(wonAmount > 0 ? '#00FF00' : '#FF0000')
        .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` });

      return interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du jeu de la roulette:', error);
      return interaction.reply({ content: 'Une erreur est survenue lors du jeu.', ephemeral: true });
    }
  }
};
