import { BannedWordList, Ranking } from "./List/WordList";
import { JsonLoader } from "./JsonLoader";

class Database {
  private static list: {
    [key: string]: JsonLoader;
  } = {};
  private saveCooldown?: NodeJS.Timeout;

  constructor() {
    if (!Database.list.word) {
      Database.list.word = new BannedWordList();
    }
  }

  get bannedWords() {
    const wordList = Database.list.word as BannedWordList;
    return wordList.bannedWords;
  }

  add(word: string) {
    const wordList = Database.list.word as BannedWordList;
    const result = wordList.add(word.toLowerCase());
    if (result) this.save();
    return result;
  }

  wordList() {
    const wordList = Database.list.word as BannedWordList;
    return wordList.wordList();
  }

  remove(word: string) {
    const wordList = Database.list.word as BannedWordList;
    const result = wordList.remove(word.toLowerCase());
    if (result) this.save();
    return result;
  }

  ranking(word?: string, userId?: string): Ranking[] {
    const wordList = Database.list.word as BannedWordList;
    const result = wordList.ranking(word?.toLowerCase(), userId);

    return result;
  }

  count(word: string, userId: string) {
    const wordList = Database.list.word as BannedWordList;
    wordList.count(word.trim().toLowerCase(), userId);

    this.save();
  }

  save() {
    if (this.saveCooldown) {
      clearTimeout(this.saveCooldown);
    }
    this.saveCooldown = setTimeout(() => {
      Object.values(Database.list).forEach((loader) => {
        loader.save();
        console.log("Saved!");
      });
      this.saveCooldown = undefined;
    }, 10000);
  }
}

export { Database };
