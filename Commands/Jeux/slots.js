const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

const slotItems = ['🍒', '🍋', '🍇', '🍉', '🔔', '⭐', '7️⃣'];

function getSlotResults() {
  return [
    slotItems[Math.floor(Math.random() * slotItems.length)],
    slotItems[Math.floor(Math.random() * slotItems.length)],
    slotItems[Math.floor(Math.random() * slotItems.length)],
  ];
}

function calculateWinnings(results, bet) {
  if (results[0] === results[1] && results[1] === results[2]) {
    return bet * 5;
  } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
    return bet * 2;
  } else {
    return 0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Jouez à la machine à sous et tentez de gagner des points !')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Le montant à parier')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const bet = interaction.options.getInteger('bet');

    try {
      const userEconomy = await UserEconomySchema.findOne({ userId, guildId });

      if (!userEconomy) {
        return interaction.reply({ content: 'Vous n\'avez pas de compte économique, veuillez commencer à gagner des points avant de jouer.', ephemeral: true });
      }

      if (userEconomy.isBanned) {
        return interaction.reply({ content: 'Vous êtes banni et ne pouvez pas jouer aux machines à sous.', ephemeral: true });
      }

      if (bet > userEconomy.balance) {
        return interaction.reply({ content: `Vous n'avez pas assez de points pour parier ${bet} points.`, ephemeral: true });
      }

      const results = getSlotResults();

      const winnings = calculateWinnings(results, bet);
      if (winnings > 0) {
        userEconomy.balance += winnings;
        await interaction.reply({
          content: `🎉 Félicitations ! Vous avez gagné **${winnings}** points avec une mise de **${bet}** points !`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🎰 Résultats de la Machine à Sous 🎰')
              .setDescription(`| ${results[0]} | ${results[1]} | ${results[2]} |`)
              .setColor('#00FF00')
              .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` })

          ]
        });
      } else {
        userEconomy.balance -= bet;
        await interaction.reply({
          content: `😢 Vous avez perdu votre mise de **${bet}** points. Réessayez pour tenter votre chance !`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🎰 Résultats de la Machine à Sous 🎰')
              .setDescription(`| ${results[0]} | ${results[1]} | ${results[2]} |`)
              .setColor('#FF0000')
              .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` })
          ]
        });
      }

      await userEconomy.save();

    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande slots :', error);
      await interaction.reply({ content: 'Une erreur est survenue lors du jeu à la machine à sous.', ephemeral: true });
    }
  },
};
