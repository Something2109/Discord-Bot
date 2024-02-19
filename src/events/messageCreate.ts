import { Events, Message } from "discord.js";
import { Database } from "../utils/database/Database";

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    const guildData = Database.get(message.guild?.id);

    if (
      guildData &&
      !guildData.bannedWord.isEmpty() &&
      message.author.id !== process.env.CLIENT_ID
    ) {
      const wordContained = [
        ...message.content
          .toLowerCase()
          .matchAll(guildData.bannedWord.bannedWords!),
      ];
      if (wordContained.length > 0) {
        for (const word of wordContained) {
          guildData.bannedWord.count(word[0], message.author.id);
        }

        let replySentence = guildData.sentenceList.get();
        if (!replySentence) replySentence = "Stop saying the banned word";

        message.reply(`${replySentence}, ${message.author}`);
      }
    }
  },
};
