import { BannedWordList } from "./List/WordList";
import path from "node:path";
import { WorldList } from "./List/WorldList";
import { WarningSentenceList } from "./List/SentenceList";
import { JsonLoader } from "./JsonLoader";

/**
 * The cache save cell.
 * Contains the data and the timeout function.
 */
interface CacheRecord {
  data: JsonLoader<any>;
  timeout?: NodeJS.Timeout;
}

/**
 * The class contains all the data relevant to a guild.
 * Guild data is saved by using the id-named folder - containing all the relevant json files -
 * placed in the base folder added when creation.
 */
class GuildData {
  private readonly id: string;
  private readonly savePath: string;
  private readonly cache: { [key: string]: CacheRecord };

  constructor(id: string, basePath: string) {
    this.id = id;
    this.savePath = path.join(basePath, this.id);
    this.cache = {};
  }

  /**
   * Check the cache if contains the data.
   * If has, update the timeout and return the data from there.
   * Else, create a record in the cache and return the data.
   * @param c The class to check.
   * @param cachetime The time (by minute) to keep the file in the cache before delete.
   * @returns
   */
  get<T extends JsonLoader<any>>(c: { new (path: string): T }): T {
    const key = c.name;
    if (!this.cache[key]) {
      this.cache[key] = {
        data: new c(this.savePath),
      };
    } else {
      clearTimeout(this.cache[key].timeout);
    }

    const cachetime = this.cache[key].data.cacheTime;
    this.cache[key].timeout =
      cachetime > 0
        ? setTimeout(() => delete this.cache[key], cachetime * 60000)
        : undefined;

    return this.cache[key].data as T;
  }
}

export { GuildData };
