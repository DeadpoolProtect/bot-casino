const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

const cards = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'
];

const suits = ['♠', '♣', '♥', '♦'];

function drawCard() {
  const card = cards[Math.floor(Math.random() * cards.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { card, suit };
}

function calculateHandValue(hand) {
  const values = hand.map(h => cards.indexOf(h.card) + 2);
  return values.reduce((acc, value) => acc + value, 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poker')
    .setDescription('Jouez une main de poker contre le bot.')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Le montant de points à miser.')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const bet = interaction.options.getInteger('bet');

    try {
      const userEconomy = await UserEconomySchema.findOne({ userId, guildId });

      if (!userEconomy) {
        return interaction.reply({ content: 'Vous n\'avez pas de compte économique, utilisez une commande de gain avant.', ephemeral: true });
      }

      if (userEconomy.isBanned) {
        return interaction.reply({ content: 'Vous êtes banni du système et ne pouvez pas jouer au poker.', ephemeral: true });
      }

      if (bet > userEconomy.balance) {
        return interaction.reply({ content: `Vous n'avez pas assez de points pour parier ${bet} points.`, ephemeral: true });
      }

      const playerHand = [drawCard(), drawCard()];
      const botHand = [drawCard(), drawCard()];

      const playerValue = calculateHandValue(playerHand);
      const botValue = calculateHandValue(botHand);

      let resultMessage;
      let resultEmbed;
      if (playerValue > botValue) {
        userEconomy.balance += bet;
        resultMessage = `Vous avez gagné avec une main de ${playerValue} contre la main du bot de ${botValue}!`;
        resultEmbed = new EmbedBuilder()
          .setTitle('🎉 Victoire !')
          .setDescription(resultMessage)
          .setColor('#00FF00')
          .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` });
      } else if (playerValue < botValue) {
        userEconomy.balance -= bet;
        resultMessage = `Vous avez perdu avec une main de ${playerValue} contre la main du bot de ${botValue}.`;
        resultEmbed = new EmbedBuilder()
          .setTitle('😞 Défaite')
          .setDescription(resultMessage)
          .setColor('#FF0000')
          .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` });
      } else {
        resultMessage = `Égalité avec une main de ${playerValue} contre la main du bot de ${botValue}.`;
        resultEmbed = new EmbedBuilder()
          .setTitle('🤝 Égalité')
          .setDescription(resultMessage)
          .setColor('#FFFF00')
          .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` });
      }

      await userEconomy.save();

      const playerCards = playerHand.map(card => `${card.card}${card.suit}`).join(' ');
      const botCards = botHand.map(card => `${card.card}${card.suit}`).join(' ');

      const handEmbed = new EmbedBuilder()
        .setTitle('Poker : Votre main')
        .addFields(
          { name: 'Votre main', value: playerCards, inline: true },
          { name: 'Main du bot', value: botCards, inline: true }
        )
        .setColor('#3498DB');

      await interaction.reply({ embeds: [handEmbed, resultEmbed] });

    } catch (error) {
      console.error('Erreur lors de la commande poker :', error);
      await interaction.reply({ content: 'Une erreur est survenue lors de la commande poker.', ephemeral: true });
    }
  }
};
