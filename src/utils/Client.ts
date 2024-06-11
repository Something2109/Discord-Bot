import { Client, Collection, Routes, REST, ClientOptions } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { Database } from "./database/Database";
import { Logger } from "./Logger";
import { Connection, DefaultConnection } from "./music/Connection";
import { DiscordController } from "./controller/Discord";
import { ConsoleLineInterface } from "./Console";
const rootPath = path.dirname(path.dirname(__filename));

/**
 * The class responsible for communicating and executing
 * Discord related interactions.
 * Contains functions for updating and managing commands
 * and events of the bot.
 */
class CustomClient extends Client {
  private commands: Collection<string, DiscordController>;
  private readonly clientId: string;
  public readonly logger: Logger;
  public readonly connection: Connection;

  constructor(options: ClientOptions) {
    super(options);
    if (!process.env.CLIENT_ID) {
      throw new Error("You must put the client ID to the env file.");
    }
    this.clientId = process.env.CLIENT_ID;
    this.commands = new Collection<string, DiscordController>();
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
   * Load the commands from all the commands declaration files
   * located in the commands folder from the root.
   */
  public readCommands() {
    const commandsPath = path.join(rootPath, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file: string) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      const discordCmd = command.discord;
      const cliCmd = command.cli;

      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if (discordCmd) {
        "name" in discordCmd && "data" in discordCmd && "execute" in discordCmd
          ? this.commands.set(discordCmd.name, discordCmd)
          : this.logger.log(
              `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
      }
      if (cliCmd) {
        "name" in cliCmd && "help" in cliCmd && "execute" in cliCmd
          ? ConsoleLineInterface.commands.set(cliCmd.name, cliCmd)
          : this.logger.log(
              `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
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

  /**
   * Refresh the command for all the guilds.
   */
  public refreshCommandsAll() {
    this.logger.log(
      `Started refreshing application (/) commands for all guilds`
    );

    Database.guildList.forEach((guildId) => {
      this.refreshCommands(guildId);
    });
  }

  /**
   * Refresh commands for a specified server.
   * @param guildId The guild id to refresh.
   */
  public async refreshCommands(guildId: string) {
    try {
      const rest = new REST().setToken(process.env.TOKEN!);
      const route = Routes.applicationGuildCommands(this.clientId, guildId);
      const body = this.commands.map((command) =>
        command.data(guildId).toJSON()
      );

      // The put method is used to fully refresh all commands in the guild with the current set
      await rest.put(route, { body });

      this.logger.log(
        `Successfully reloaded application (/) commands to server ${guildId}`
      );
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      this.logger.error(error);
    }
  }

  public getCommand(commandName: string | undefined) {
    return commandName ? this.commands.get(commandName) : undefined;
  }
}

export { CustomClient };
