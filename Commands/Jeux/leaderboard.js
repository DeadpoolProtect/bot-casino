const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des utilisateurs avec le plus de jetons.'),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    try {
      const topUsers = await UserEconomySchema.find({ guildId })
        .sort({ balance: -1 })
        .limit(10);

      if (topUsers.length === 0) {
        return interaction.reply({ content: 'Il n\'y a pas encore de données pour le classement.', ephemeral: true });
      }

      let leaderboard = '';
      topUsers.forEach((user, index) => {
        leaderboard += `**${index + 1}.** <@${user.userId}> - **${user.balance} jetons**\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🏆 Classement des Jetons 🏆')
        .setDescription(leaderboard)
        .setColor('#FFD700')
        .setFooter({ text: 'Félicitations aux meilleurs joueurs !' });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lors de la récupération du classement:', error);
      return interaction.reply({ content: 'Une erreur est survenue lors de la récupération du classement.', ephemeral: true });
    }
  },
};
