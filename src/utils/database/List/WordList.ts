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

class WordList extends JsonLoader {
  list: WordRankingList[];
  path = "./database/banned-word.json";

  constructor() {
    super();
    this.list = [];
    this.load();
  }

  /**
   * Get the regex to extract banned word from text.
   */
  get bannedWords(): RegExp {
    return this.list.length > 0
      ? new RegExp(
          this.list
            .map((value) => `(?:[".(_*-]|\b|^)${value.word}(?:[".)_*-]|\b|$)`)
            .join("|"),
          "g"
        )
      : /$^/g;
  }

  /**
   * Set a banned word to database.
   */
  set bannedWord(word: string) {
    const wordRanking = this.list.find((value) => value.word == word);
    if (!wordRanking) {
      this.list.push({
        word,
        list: [],
      });
    }
  }

  remove(word: string) {
    const wordRanking = this.list.find((value) => value.word == word);
    if (wordRanking) {
      this.list.splice(this.list.indexOf(wordRanking), 1);
    }
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
    }
  }

  /**
   * Return the ranking of banned word from the given options.
   * @param word The optional word to search.
   * @param userId The optional user to search.
   * @returns The ranking list of the user or word.
   */
  ranking(word?: string, userId?: string): Ranking[] | undefined {
    if (word && userId) {
    }
    if (word) {
      return this.userRanking(word);
    }
    if (userId) {
      return this.wordRanking(userId);
    }
    return this.totalRanking();
  }

  /**
   * Return the user ranking of banned words spoken.
   * @returns The user ranking.
   */
  private totalRanking() {
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

  /**
   * Return the work ranking of a specific user.
   * @param userId The user to search.
   * @returns The ranking array.
   */
  private wordRanking(userId: string) {
    const ranking: Ranking[] = [];

    this.list.forEach(({ word, list }) => {
      const userCount = list.find((value) => (value.id = userId));
      if (userCount) {
        ranking.push({ word, count: userCount.count });
      }
    });

    return ranking.sort((a, b) => b.count - a.count);
  }

  /**
   * Return the user ranking of a specific word.
   * @param word The word to search.
   * @returns The ranking array.
   */
  private userRanking(word: string): Ranking[] | undefined {
    return this.list
      .find((value) => value.word == word)
      ?.list.sort((a, b) => b.count - a.count);
  }
}

export { WordList as BannedWordList, Ranking };
