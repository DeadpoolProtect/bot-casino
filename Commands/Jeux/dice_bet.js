const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice_bet')
    .setDescription('Pariez vos points sur le résultat d\'un lancer de dé.')
    .addIntegerOption(option =>
      option.setName('montant')
        .setDescription('Le montant que vous souhaitez parier')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('choix')
        .setDescription('Votre prédiction du résultat du dé')
        .setRequired(true)
        .addChoices(
          { name: 'D6 (1 à 6)', value: 6 },
          { name: 'D20 (1 à 20)', value: 20 }
        )),

  async execute(interaction) {
    const montant = interaction.options.getInteger('montant');
    const diceType = interaction.options.getInteger('choix');
    const user = interaction.user;
    const guildId = interaction.guild.id;

    try {
      const userEconomy = await UserEconomySchema.findOne({ userId: user.id, guildId });

      if (!userEconomy) {
        return interaction.reply({ content: 'Vous n\'avez pas de compte économique. Veuillez en créer un.', ephemeral: true });
      }

      if (userEconomy.isBanned) {
        return interaction.reply({ content: 'Vous êtes banni de l\'économie et ne pouvez pas parier.', ephemeral: true });
      }

      if (userEconomy.balance < montant) {
        return interaction.reply({ content: `Vous n'avez pas assez de points pour parier ${montant} points.`, ephemeral: true });
      }

      const result = Math.floor(Math.random() * diceType) + 1;
      const winningMultiplier = diceType === 6 ? 5 : 10;

      const isWin = result === diceType;

      if (isWin) {
        const gain = montant * winningMultiplier;
        userEconomy.balance += gain;

        const embed = new EmbedBuilder()
          .setTitle('🎲 Résultat du Pari de Dé 🎲')
          .setDescription(`${user.username}, vous avez gagné ! Le dé a donné **${result}**.`)
          .addFields(
            { name: 'Gain', value: `${gain} points` },
            { name: 'Nouveau solde', value: `${userEconomy.balance} points` }
          )
          .setColor('#00FF00');

        await interaction.reply({ embeds: [embed] });

      } else {
        userEconomy.balance -= montant;

        const embed = new EmbedBuilder()
          .setTitle('🎲 Résultat du Pari de Dé 🎲')
          .setDescription(`${user.username}, vous avez perdu ! Le dé a donné **${result}**, et vous avez parié sur **${diceType}**.`)
          .addFields(
            { name: 'Perte', value: `${montant} points` },
            { name: 'Nouveau solde', value: `${userEconomy.balance} points` }
          )
          .setColor('#FF0000');

        await interaction.reply({ embeds: [embed] });
      }

      await userEconomy.save();

    } catch (error) {
      console.error('Erreur lors du pari de dé:', error);
      await interaction.reply({ content: 'Une erreur est survenue lors du pari de dé.', ephemeral: true });
    }
  },
};
