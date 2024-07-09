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
  private static path = path.join(".", "database");
  private static readonly logger = new Logger("DTB");

  static get guilds(): typeof this.list {
    if (!this.list) {
      this.initiate();
    }
    return this.list;
  }

  /**
   * Load the database with the new instance.
   * Remove the old one if has.
   */
  static initiate() {
    this.list = this.create();
  }

  /**
   * Add a database path to the instance.
   * @param folderPath The path to load.
   */
  static use(folderPath: string) {
    this.path = folderPath;
  }

  /**
   * Create a new instance of guild list and return it.
   * @returns An instance of the database.
   */
  private static create() {
    const newGuilds: typeof this.list = {};
    if (!fs.existsSync(this.path)) {
      fs.mkdirSync(this.path);
    }
    const guildList = fs
      .readdirSync(this.path)
      .filter((name) => fs.lstatSync(path.join(this.path, name)).isDirectory());

    guildList.forEach((guildId) => {
      newGuilds[guildId] = new GuildData(guildId, this.path);
    });
    return newGuilds;
  }

  /**
   * Add the guild with the given id to the database.
   * @param guildId The id to add.
   * @returns The id if success else undefined.
   */
  static add(guildId: string) {
    if (this.guilds[guildId] == undefined) {
      fs.mkdirSync(path.join(this.path, guildId));
      this.guilds[guildId] = new GuildData(guildId, this.path);

      this.logger.log(`Added the guild ${guildId} to the database`);
      return guildId;
    }
    return undefined;
  }

  static get guildList() {
    return Object.keys(this.guilds);
  }

  /**
   * Get the guild data from the id.
   * @param guildId The id to get data.
   * @returns The data of the guild if database contains else undefined.
   */
  static get(guildId?: string) {
    if (guildId && this.guilds[guildId] !== undefined) {
      return this.guilds[guildId];
    }
    return undefined;
  }

  /**
   * Remove the guild with the given id from the database.
   * @param guildId The id to remove.
   * @returns The id if success else undefined.
   */
  static remove(guildId: string) {
    if (this.guilds[guildId] !== undefined) {
      fs.rmSync(path.join(this.path, guildId));
      delete this.guilds[guildId];

      this.logger.log(`Removed the guild ${guildId} to the database`);
      return guildId;
    }
    return undefined;
  }
}

export { Database };
