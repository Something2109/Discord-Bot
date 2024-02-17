import { JsonLoader } from "../JsonLoader";

/**
 * Contains the saved words and the number count of each user to each word.
 */
class SentenceList extends JsonLoader {
  protected SaveName = "warning-sentence.json";
  protected list: string[];
  protected path: string;

  constructor(path: string) {
    super();
    this.list = [];
    this.path = path;
    this.load();
  }

  /**
   * Set a sentence to database.
   * @param sentence The sentence to set.
   * @returns The sentence if success else undefined.
   */
  add(sentence: string) {
    const search = this.list.includes(sentence);
    if (!search) {
      this.list.push(sentence);
      this.save();
      return sentence;
    }
    return undefined;
  }

  /**
   * Get a random sentence from the list.
   * @returns The sentence to get if the list has sentence else undefined.
   */
  get(): string | undefined {
    if (this.list.length > 0) {
      const index = Math.floor(Math.random() * this.list.length);
      return this.list[index];
    }
    return undefined;
  }

  /**
   * Remove a sentence from the list.
   * @param sentence The sentence to remove.
   * @returns The sentence if success else undefined.
   */
  remove(sentence: string) {
    const place = this.list.indexOf(sentence);
    if (place > -1) {
      this.list.splice(place, 1);
      this.save();
      return sentence;
    }
    return undefined;
  }
}

export { SentenceList as WarningSentenceList };
