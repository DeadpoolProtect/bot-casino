const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Travaillez pour gagner des points (0 à 1000) toutes les heures.'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const currentTime = Date.now();

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
        return interaction.reply({ content: 'Vous êtes banni du système et ne pouvez pas travailler.', ephemeral: true });
      }

      const oneHour = 60 * 60 * 1000;
      if (userEconomy.lastWork && currentTime - userEconomy.lastWork < oneHour) {
        const timeLeft = Math.round((oneHour - (currentTime - userEconomy.lastWork)) / 60000);
        return interaction.reply({ content: `Vous avez déjà travaillé récemment ! Vous pourrez travailler à nouveau dans ${timeLeft} minutes.`, ephemeral: true });
      }

      const earnedPoints = Math.floor(Math.random() * 1001);

      userEconomy.balance += earnedPoints;
      userEconomy.lastWork = currentTime;
      await userEconomy.save();

      const embed = new EmbedBuilder()
        .setTitle('Travail effectué !')
        .setDescription(`Félicitations ${interaction.user.username}, vous avez gagné **${earnedPoints}** points !`)
        .setColor('#00FF00')
        .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} points` });

      return interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la commande work:', error);
      return interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
    }
  }
};
