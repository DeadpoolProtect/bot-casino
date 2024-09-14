const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

const bingoNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
function generateBingoCard() {
  const card = [];
  for (let i = 0; i < 5; i++) {
    const column = bingoNumbers.slice(i * 15, (i + 1) * 15);
    card.push(column.sort(() => 0.5 - Math.random()).slice(0, 5));
  }
  card[2][2] = '⭐';
  return card;
}

function checkBingo(card, calledNumbers) {
  for (let i = 0; i < 5; i++) {
    if (card[i].every(num => calledNumbers.includes(num) || num === '⭐')) return true;
    if (card.every(row => calledNumbers.includes(row[i]) || row[i] === '⭐')) return true;
  }
  if ([0, 1, 2, 3, 4].every(i => calledNumbers.includes(card[i][i]) || card[i][i] === '⭐')) return true;
  if ([0, 1, 2, 3, 4].every(i => calledNumbers.includes(card[i][4 - i]) || card[i][4 - i] === '⭐')) return true;
  return false;
}

function displayCard(card) {
  return card.map(row => row.map(num => (num === '⭐' ? '⭐' : `\`${num.toString().padStart(2, '0')}\``)).join(' | ')).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bingo')
    .setDescription('Jouez au Bingo et tentez de gagner des points.')
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
        return interaction.reply({ content: 'Vous êtes banni et ne pouvez pas participer au Bingo.', ephemeral: true });
      }

      if (bet > userEconomy.balance) {
        return interaction.reply({ content: `Vous n'avez pas assez de points pour parier ${bet} points.`, ephemeral: true });
      }

      const bingoCard = generateBingoCard();
      const calledNumbers = [];

      let winner = false;
      let turnCount = 0;

      while (!winner && turnCount < 50) {
        const randomNumber = bingoNumbers[Math.floor(Math.random() * bingoNumbers.length)];
        calledNumbers.push(randomNumber);
        turnCount++;

        if (checkBingo(bingoCard, calledNumbers)) {
          winner = true;
          break;
        }
      }

      const winnings = winner ? bet * 3 : 0;
      if (winner) {
        userEconomy.balance += winnings;
        await interaction.reply({
          content: `🎉 Vous avez fait un Bingo en ${turnCount} tours et gagné **${winnings}** points !`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🟢 Carte de Bingo 🟢')
              .setDescription(displayCard(bingoCard))
              .setColor('#00FF00')
              .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` })
          ]
        });
      } else {
        userEconomy.balance -= bet;
        await interaction.reply({
          content: `😢 Vous avez perdu après ${turnCount} tours. Aucun Bingo cette fois-ci.`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🔴 Carte de Bingo 🔴')
              .setDescription(displayCard(bingoCard))
              .setColor('#FF0000')
              .setFooter({ text: `Votre solde actuel : ${userEconomy.balance} jetons` })
          ]
        });
      }

      await userEconomy.save();

    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande bingo :', error);
      await interaction.reply({ content: 'Une erreur est survenue lors de la partie de Bingo.', ephemeral: true });
    }
  },
};
