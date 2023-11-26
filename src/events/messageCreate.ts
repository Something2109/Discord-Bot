import { Events, Message } from "discord.js";
import { Database } from "../utils/database/Database";

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    const wordList = message.guild?.id
      ? Database.get(message.guild?.id)?.bannedWord
      : undefined;

    if (wordList && message.author.id !== process.env.CLIENT_ID) {
      const wordContained = [...message.content.matchAll(wordList.bannedWords)];
      if (wordContained.length > 0) {
        for (const word of wordContained) {
          wordList.count(word[0], message.author.id);
        }
        message.reply(`Stop saying the banned word, ${message.author}`);
      }
    }
  },
};
