const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Duel avec un autre utilisateur et parie des points.')
    .addIntegerOption(option =>
      option.setName('montant')
        .setDescription('Le montant à parier')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('adversaire')
        .setDescription('L\'utilisateur avec qui vous voulez faire un duel')
        .setRequired(true)),

  async execute(interaction) {
    const montant = interaction.options.getInteger('montant');
    const challenger = interaction.user;
    const adversaire = interaction.options.getUser('adversaire');
    const guildId = interaction.guild.id;

    if (challenger.id === adversaire.id) {
      return interaction.reply({ content: 'Vous ne pouvez pas faire un duel avec vous-même.', ephemeral: true });
    }

    try {
      const challengerEconomy = await UserEconomySchema.findOne({ userId: challenger.id, guildId });
      const adversaireEconomy = await UserEconomySchema.findOne({ userId: adversaire.id, guildId });

      if (!challengerEconomy || !adversaireEconomy) {
        return interaction.reply({ content: 'Un des deux participants n\'a pas de compte économique actif.', ephemeral: true });
      }

      if (challengerEconomy.isBanned || adversaireEconomy.isBanned) {
        return interaction.reply({ content: 'L\'un des utilisateurs est banni et ne peut pas participer à un duel.', ephemeral: true });
      }

      if (challengerEconomy.balance < montant) {
        return interaction.reply({ content: `Vous n'avez pas assez de points pour parier ${montant} points.`, ephemeral: true });
      }

      if (adversaireEconomy.balance < montant) {
        return interaction.reply({ content: `${adversaire.username} n'a pas assez de points pour parier ${montant} points.`, ephemeral: true });
      }

      await interaction.reply({ content: `${challenger.username} a défié ${adversaire.username} pour un duel de ${montant} points ! En attente d'une réponse...` });

      const winner = Math.random() < 0.5 ? challenger : adversaire;
      const loser = winner.id === challenger.id ? adversaire : challenger;

      if (winner.id === challenger.id) {
        challengerEconomy.balance += montant;
        adversaireEconomy.balance -= montant;
      } else {
        adversaireEconomy.balance += montant;
        challengerEconomy.balance -= montant;
      }

      await challengerEconomy.save();
      await adversaireEconomy.save();

      const embed = new EmbedBuilder()
        .setTitle('🏆 Duel Résultats 🏆')
        .setDescription(`${challenger.username} vs ${adversaire.username}`)
        .addFields(
          { name: 'Gagnant', value: `**${winner.username}** remporte le duel ! 🎉` },
          { name: 'Perdant', value: `${loser.username} a perdu ${montant} points... 😢` }
        )
        .setColor('#FFD700');

      await interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'exécution du duel:', error);
      await interaction.reply({ content: 'Une erreur est survenue lors du duel.', ephemeral: true });
    }
  },
};
