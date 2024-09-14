const { ShardingManager, ShardEvents } = require("discord.js");
require("dotenv").config();

const cron = require('node-cron');
const LotterySchema = require('./Schema/LotterySchema');
const UserEconomySchema = require('./Schema/UserEconomySchema');

const manager = new ShardingManager("./bot.js", {
  token: process.env.Token,
  shardList: "auto",
  respawn: true,
  autoSpawn: true,
  totalShards: "auto",
});


cron.schedule('0 20 * * *', async () => {
  try {
    const tickets = await LotterySchema.find();
    if (tickets.length === 0) return;

    const winningTicket = tickets[Math.floor(Math.random() * tickets.length)];
    const winner = winningTicket.userId;
    
    const reward = 1000;

    let winnerEconomy = await UserEconomySchema.findOne({ userId: winner });
    if (!winnerEconomy) {
      winnerEconomy = new UserEconomySchema({
        userId: winner,
        guildId: winningTicket.guildId,
        balance: reward
      });
    } else {
      winnerEconomy.balance += reward;
    }
    await winnerEconomy.save();

    const user = await client.users.fetch(winner);
    await user.send(`🎉 Félicitations ! Vous avez gagné **${reward} jetons** dans la loterie !`);

    await LotterySchema.deleteMany({ userId: winner });

  } catch (error) {
    console.error('Erreur lors du tirage au sort de la loterie:', error);
  }
});

manager.on("shardCreate", (shard) => {
  shard
    .on(ShardEvents.Ready, () => {
      console.log(`Shard ${shard.id} connecté.`, "client");
    })
    .on(ShardEvents.Disconnect, () => {
      console.log(`Shard ${shard.id} déconnecté.`, "client");
    })
    .on(ShardEvents.Reconnecting, () => {
      console.log(`Shard ${shard.id} reconnection.`, "client");
    })
    .on(ShardEvents.Error, (error) => {
      console.log(
        `Shard ${shard.id} a rencontré une erreur: ${error.message}`,
        "client"
      );
    })
    .on(ShardEvents.Death, () => {
      console.log(`Shard ${shard.id} est mort.`, "client");
    });
});

manager
  .spawn({ amount: manager.totalShards, delay: null, timeout: -1 })
  .then(async (shards) => {
    console.log(`${shards.size} Shard(s) actif(s).`, "client");
  })
  .catch((err) => {
    return console.log(`Une erreur s'est produite :\n${err}`, "error");
  });


module.exports = manager;
