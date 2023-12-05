import { JsonLoader } from "../JsonLoader";

interface WordRankingList {
  word: string;
  list: Required<Omit<Ranking, "word">>[];
}

type Ranking = {
  id?: string;
  word?: string;
  count: number;
};

/**
 * Contains the saved words and the number count of each user to each word.
 */
class WordList extends JsonLoader {
  protected SaveName = "banned-word.json";
  protected list: WordRankingList[];
  protected path: string;

  constructor(path: string) {
    super();
    this.list = [];
    this.path = path;
    this.load();
  }

  /**
   * Get the regex to extract banned word from text.
   */
  get bannedWords(): RegExp | undefined {
    return this.list.length > 0
      ? new RegExp(
          `(?:[".(_*-]|\\b|^)(${this.list
            .map((x) => x.word)
            .join("|")})(?:[".)_*-]|\\b|$)`,
          "g"
        )
      : undefined;
  }

  /**
   * Set a banned word to database.
   * @param word The word to set.
   * @returns The word if success else undefined.
   */
  add(word: string) {
    const wordRanking = this.list.find((value) => value.word == word);
    if (!wordRanking) {
      const newWord = {
        word,
        list: [],
      };
      this.list.push(newWord);
      this.save();
      return word;
    }
    return undefined;
  }

  /**
   * Get the word list currently stored.
   * @returns The ranking object containing the words and total count of each.
   */
  wordList() {
    return this.wordRanking();
  }

  /**
   * Remove a word from the list.
   * @param word The word to remove.
   * @returns The word if success else undefined.
   */
  remove(word: string) {
    const wordRanking = this.list.find((value) => value.word == word);
    if (wordRanking) {
      this.list.splice(this.list.indexOf(wordRanking), 1);
      this.save();
      return word;
    }
    return undefined;
  }

  /**
   * Add each time the user types the banned word.
   * @param word The banned word.
   * @param userId The user typing it.
   */
  count(word: string, userId: string) {
    const wordRanking = this.list.find((value) => value.word == word);
    if (wordRanking) {
      const userCount = wordRanking.list.find((value) => value.id == userId);
      if (userCount) {
        userCount.count += 1;
      } else {
        wordRanking.list.push({
          id: userId,
          count: 1,
        });
      }
      this.save();
    }
  }

  /**
   * Return the ranking of banned word from the given options.
   * @param word The optional word to search.
   * @param userId The optional user to search.
   * @returns The ranking list of the user or word.
   */
  ranking(word?: string, userId?: string): Ranking[] {
    if (userId) {
      return this.wordRanking(userId);
    }
    return this.userRanking(word);
  }

  /**
   * Return the work ranking of a specific user.
   * If no user given, it returns the global word ranking.
   * @param userId The user to search.
   * @returns The ranking array.
   */
  private wordRanking(userId?: string): Ranking[] {
    const ranking: Ranking[] = [];

    this.list.forEach(({ word, list }) => {
      if (userId) {
        const userCount = list.find((value) => (value.id = userId));
        if (userCount) {
          ranking.push({ word, count: userCount.count });
        }
      } else {
        const wordCount = list.reduce((sum, value) => sum + value.count, 0);
        ranking.push({ word, count: wordCount });
      }
    });

    return ranking.sort((a, b) => b.count - a.count);
  }

  /**
   * Return the user ranking of a specific word.
   * If no word given, return the user ranking of banned words spoken.
   * @param word The word to search.
   * @returns The ranking array.
   */
  private userRanking(word?: string): Ranking[] {
    if (word) {
      const ranking = this.list.find((value) => value.word == word);
      return ranking ? ranking.list.sort((a, b) => b.count - a.count) : [];
    }

    const ranking: Ranking[] = [];

    this.list.forEach(({ word, list }) => {
      list.forEach(({ id, count }) => {
        const userCount = ranking.find((value) => value.id == id);
        if (userCount) {
          userCount.count += count;
        } else {
          ranking.push({ id, count });
        }
      });
    });

    return ranking.sort((a, b) => b.count - a.count);
  }
}

export { WordList as BannedWordList, Ranking };
