const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');
const LotterySchema = require('../../Schema/LotterySchema'); // Assurez-vous de créer ce schéma

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loterie')
    .setDescription('Achetez un billet de loterie avec des jetons.')
    .addIntegerOption(option =>
      option.setName('nombre')
        .setDescription('Nombre de billets à acheter.')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const numberOfTickets = interaction.options.getInteger('nombre');
    const ticketPrice = 100; 

    if (numberOfTickets <= 0) {
      return interaction.reply({ content: 'Le nombre de billets doit être supérieur à 0.', ephemeral: true });
    }

    try {
      let userEconomy = await UserEconomySchema.findOne({ userId, guildId });
      if (!userEconomy) {
        userEconomy = new UserEconomySchema({
          userId,
          guildId,
          balance: 0
        });
        await userEconomy.save();
      }

      const totalCost = numberOfTickets * ticketPrice;

      if (userEconomy.balance < totalCost) {
        return interaction.reply({ content: 'Vous n\'avez pas assez de jetons pour acheter ces billets.', ephemeral: true });
      }

      userEconomy.balance -= totalCost;
      await userEconomy.save();

      // Ajout des billets de loterie dans la base de données
      for (let i = 0; i < numberOfTickets; i++) {
        await LotterySchema.create({
          userId,
          guildId,
          ticketNumber: Math.random().toString(36).substring(2) // Génère un ticket unique
        });
      }

      return interaction.reply({ content: `Vous avez acheté **${numberOfTickets}** billets de loterie pour **${totalCost}** jetons. Bonne chance !`, ephemeral: true });

    } catch (error) {
      console.error('Erreur lors de l\'achat des billets de loterie:', error);
      return interaction.reply({ content: 'Une erreur est survenue lors de l\'achat des billets de loterie.', ephemeral: true });
    }
  },
};
