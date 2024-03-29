import { GuildData } from "./GuildData";
import fs from "fs";
import path from "node:path";
import { Logger } from "../Logger";

/**
 * The database class.
 * Contains and manages the list of guild data.
 * Access the guild data contained by using the guild id as the key to access the data.
 */
class Database {
  private static list: {
    [guild_id: string]: GuildData;
  };
  private static readonly path = path.join(".", "database");
  private static readonly logger = new Logger("DTB");

  /**
   * Get the info stored in the database of the system.
   * If not installed then load it from the saved file.
   * @returns An instance of the database.
   */
  private static getInstance() {
    if (!(Database.list instanceof Object)) {
      Database.list = {};
      if (fs.existsSync(Database.path)) {
        const guildList = fs
          .readdirSync(Database.path)
          .filter((name) =>
            fs.lstatSync(path.join(Database.path, name)).isDirectory()
          );

        guildList.forEach((guildId) => {
          Database.list[guildId] = new GuildData(guildId, Database.path);
        });
      }
    }
    return this.list;
  }

  /**
   * Add the guild with the given id to the database.
   * @param guildId The id to add.
   * @returns The id if success else undefined.
   */
  static add(guildId: string) {
    const guildList = this.getInstance();
    if (guildList[guildId] == undefined) {
      fs.mkdirSync(path.join(Database.path, guildId));
      guildList[guildId] = new GuildData(guildId, Database.path);

      Database.logger.log(`Added the guild ${guildId} to the database`);
      return guildId;
    }
    return undefined;
  }

  static get guildList() {
    const guildList = this.getInstance();
    return Object.keys(guildList);
  }

  /**
   * Get the guild data from the id.
   * @param guildId The id to get data.
   * @returns The data of the guild if database contains else undefined.
   */
  static get(guildId?: string) {
    const guildList = this.getInstance();
    if (guildId && guildList[guildId] !== undefined) {
      return guildList[guildId];
    }
    return undefined;
  }

  /**
   * Remove the guild with the given id from the database.
   * @param guildId The id to remove.
   * @returns The id if success else undefined.
   */
  static remove(guildId: string) {
    const guildList = this.getInstance();
    if (guildList[guildId] !== undefined) {
      fs.rmSync(path.join(Database.path, guildId));
      delete guildList[guildId];

      Database.logger.log(`Removed the guild ${guildId} to the database`);
      return guildId;
    }
    return undefined;
  }
}

export { Database };
