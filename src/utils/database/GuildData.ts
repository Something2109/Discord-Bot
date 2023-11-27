import { BannedWordList } from "./List/WordList";
import path from "node:path";
import { WorldList } from "./List/WorldList";

/**
 * The class contains all the data relevant to a guild.
 * Guild data is saved by using the id-named folder - containing all the relevant json files -
 * placed in the base folder added when creation.
 */
class GuildData {
  private readonly id;
  public bannedWord: BannedWordList;
  public world: WorldList;

  constructor(id: string, basePath: string) {
    this.id = id;
    const savePath = path.join(basePath, this.id);
    this.bannedWord = new BannedWordList(savePath);
    this.world = new WorldList(savePath);
  }
}

export { GuildData };
