import { Events, Message } from "discord.js";
import { Database } from "../utils/database/Database";

const database = new Database();

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (
      message.guild?.id === process.env.GUILD_ID &&
      message.author.id !== process.env.CLIENT_ID
    ) {
      const wordContained = [...message.content.matchAll(database.bannedWords)];
      if (wordContained.length > 0) {
        let count = 0;
        for (const word of wordContained) {
          database.count(word[0], message.author.id);
        }
        database.save();
        message.reply(`Stop saying the banned word, ${message.author}`);
      }
    }
  },
};
