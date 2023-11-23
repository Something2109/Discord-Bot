import { GuildData } from "./GuildData";
import fs from "fs";
import path from "node:path";

/**
 * The database class.
 * Contains and manages the list of guild data.
 * Access the guild data contained by using the guild id as the key to access the data.
 */
class Database {
  private static guildList: {
    [guild_id: string]: GuildData;
  };
  private static readonly path = path.join(".", "database");

  constructor() {
    if (!(Database.guildList instanceof Object)) {
      Database.guildList = {};
      if (fs.existsSync(Database.path)) {
        const guildList = fs
          .readdirSync(Database.path)
          .filter((name) =>
            fs.lstatSync(path.join(Database.path, name)).isDirectory()
          );

        guildList.forEach((guildId) => {
          Database.guildList[guildId] = new GuildData(guildId, Database.path);
        });
      }
    }
  }

  /**
   * Add the guild with the given id to the database.
   * @param guildId The id to add.
   * @returns The id if success else undefined.
   */
  addGuild(guildId: string) {
    if (Database.guildList[guildId] == undefined) {
      fs.mkdirSync(path.join(Database.path, guildId));
      Database.guildList[guildId] = new GuildData(guildId, Database.path);

      return guildId;
    }
    return undefined;
  }

  /**
   * Get the guild data from the id.
   * @param guildId The id to get data.
   * @returns The data of the guild if database contains else undefined.
   */
  getGuildData(guildId: string) {
    if (Database.guildList[guildId] !== undefined) {
      return Database.guildList[guildId];
    }
    return undefined;
  }

  /**
   * Remove the guild with the given id from the database.
   * @param guildId The id to remove.
   * @returns The id if success else undefined.
   */
  removeGuild(guildId: string) {
    if (Database.guildList[guildId] !== undefined) {
      fs.rmSync(path.join(Database.path, guildId));
      delete Database.guildList[guildId];

      return guildId;
    }
    return undefined;
  }
}

export { Database };
