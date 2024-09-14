const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Joue une partie de Blackjack.')
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant à parier.')
        .setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const bet = interaction.options.getInteger('mise');

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

      const playerCards = drawCard(2);
      const dealerCards = drawCard(2);

      const playerScore = calculateScore(playerCards);
      const dealerScore = calculateScore(dealerCards);

      let result = '';
      let wonAmount = 0;

      if (playerScore === 21) {
        result = 'Blackjack! Vous gagnez!';
        wonAmount = bet * 2.5;
        userEconomy.balance += wonAmount;
      } else if (dealerScore === 21) {
        result = 'Le croupier a fait un Blackjack! Vous perdez.';
        userEconomy.balance -= bet;
      } else {
        if (playerScore > dealerScore && playerScore <= 21) {
          result = `Vous avez ${playerScore}, et le croupier a ${dealerScore}. Vous gagnez!`;
          wonAmount = bet * 2;
          userEconomy.balance += wonAmount;
        } else {
          result = `Vous avez ${playerScore}, et le croupier a ${dealerScore}. Vous perdez.`;
          userEconomy.balance -= bet;
        }
      }

      await userEconomy.save();

      const embed = new EmbedBuilder()
        .setTitle('Résultat du Blackjack')
        .setDescription(`**Vos cartes:** ${playerCards.join(', ')} (Score: ${playerScore})\n**Cartes du croupier:** ${dealerCards.join(', ')} (Score: ${dealerScore})\n\n**${result}**`)
        .setColor(playerScore > dealerScore ? '#00FF00' : '#FF0000')
        .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` });

      return interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du jeu de Blackjack:', error);
      return interaction.reply({ content: 'Une erreur est survenue lors du jeu.', ephemeral: true });
    }
  },
};

function drawCard(number) {
  const cards = [];
  const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  for (let i = 0; i < number; i++) {
    const randomCard = cardValues[Math.floor(Math.random() * cardValues.length)];
    cards.push(randomCard);
  }
  return cards;
}

function calculateScore(cards) {
  let score = 0;
  let aceCount = 0;

  cards.forEach(card => {
    if (['J', 'Q', 'K'].includes(card)) {
      score += 10;
    } else if (card === 'A') {
      aceCount += 1;
      score += 11;
    } else {
      score += parseInt(card);
    }
  });

  while (aceCount > 0 && score > 21) {
    score -= 10;
    aceCount -= 1;
  }

  return score;
}
