import { Events, Message } from "discord.js";
import { Database } from "../utils/database/Database";
import { BannedWordList } from "../utils/database/List/WordList";
import { WarningSentenceList } from "../utils/database/List/SentenceList";

module.exports = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    const guildData = Database.get(message.guild?.id);

    if (guildData && message.author.id !== process.env.CLIENT_ID) {
      const wordList = guildData.get(BannedWordList);
      const wordContained = [
        ...message.content.toLowerCase().matchAll(wordList.bannedWords),
      ];
      if (wordContained.length > 0) {
        for (const word of wordContained) {
          wordList.count(word[0], message.author.id);
        }

        let replySentence = guildData.get(WarningSentenceList).get();
        if (!replySentence) replySentence = "Stop saying the banned word";

        message.reply(`${replySentence}, ${message.author}`);
      }
    }
  },
};
