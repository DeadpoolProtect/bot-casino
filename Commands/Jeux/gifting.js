const { SlashCommandBuilder } = require('discord.js');
const UserEconomySchema = require('../../Schema/UserEconomySchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gifting')
    .setDescription('Envoyer des jetons à un autre utilisateur.')
    .addUserOption(option => 
      option.setName('destinataire')
        .setDescription('L\'utilisateur à qui vous souhaitez envoyer des jetons.')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('montant')
        .setDescription('Le nombre de jetons que vous souhaitez envoyer.')
        .setRequired(true)),

  async execute(interaction) {
    const sender = interaction.user;
    const recipient = interaction.options.getUser('destinataire');
    const amount = interaction.options.getInteger('montant');
    const guildId = interaction.guild.id;

    if (sender.id === recipient.id) {
      return interaction.reply({ content: 'Vous ne pouvez pas vous envoyer des jetons à vous-même.', ephemeral: true });
    }

    if (amount <= 0) {
      return interaction.reply({ content: 'Le montant doit être supérieur à 0.', ephemeral: true });
    }

    try {
      const senderEconomy = await UserEconomySchema.findOne({ userId: sender.id, guildId });
      let recipientEconomy = await UserEconomySchema.findOne({ userId: recipient.id, guildId });

      if (!senderEconomy || senderEconomy.balance < amount) {
        return interaction.reply({ content: 'Vous n\'avez pas assez de jetons pour effectuer ce cadeau.', ephemeral: true });
      }

      if (!recipientEconomy) {
        recipientEconomy = new UserEconomySchema({
          userId: recipient.id,
          guildId,
          balance: 0
        });
      }

      senderEconomy.balance -= amount;
      recipientEconomy.balance += amount;

      await senderEconomy.save();
      await recipientEconomy.save();

      await recipient.send(`🎁 **${sender.username}** vous a envoyé **${amount} jetons** !`);

      return interaction.reply({ content: `Vous avez envoyé **${amount} jetons** à **${recipient.username}**.`, ephemeral: true });

    } catch (error) {
      console.error('Erreur lors de l\'envoi des jetons :', error);
      return interaction.reply({ content: 'Une erreur est survenue lors de l\'envoi des jetons.', ephemeral: true });
    }
  }
};
