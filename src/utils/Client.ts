import { Client, ClientOptions } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { Database } from "./database/Database";
import { Logger } from "./Logger";
import { Connection, DefaultConnection } from "./music/Connection";
const rootPath = path.dirname(path.dirname(__filename));

/**
 * The class responsible for communicating and executing
 * Discord related interactions.
 * Contains functions for updating and managing commands
 * and events of the bot.
 */
class CustomClient extends Client {
  public readonly logger: Logger;
  public readonly connection: Connection;

  constructor(options: ClientOptions) {
    super(options);

    this.connection = new DefaultConnection();
    this.logger = new Logger("BOT");

    this.logger.log("Creating client");
  }

  /**
   * Check the availability in the database of all the guilds
   * the client is currently in.
   */
  public async existingGuildCheck() {
    const guildList = await this.guilds.fetch();

    for (const guildId of guildList.keys()) {
      if (!Database.guildList.includes(guildId)) {
        Database.add(guildId);

        this.logger.log(`Added existing guild ${guildId} to the database`);
      }
    }
  }

  /**
   * Load the event from all the event declaration files
   * located in the events folder from the root.
   */
  public initiateEvent() {
    const eventsPath = path.join(rootPath, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file: string) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      event.once
        ? this.once(event.name, (...args) => event.execute(...args))
        : this.on(event.name, (...args) => event.execute(...args));
    }
  }
}

export { CustomClient };
