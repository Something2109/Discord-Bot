import {
  Client,
  Collection,
  Routes,
  REST,
  ClientOptions,
  SlashCommandBuilder,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { Database } from "./database/Database";
import { Logger } from "./Logger";
import { Connection, DefaultConnection } from "./music/Connection";
const rootPath = path.dirname(path.dirname(__filename));

interface CommandObject {
  name: string;
  data(guildId: string): SlashCommandBuilder;
  execute(interaction: any): Promise<void>;
}

class CustomClient extends Client {
  private commands: Collection<string, CommandObject>;
  private readonly clientId: string;
  public readonly logger: Logger;
  public readonly connection: Connection;

  constructor(options: ClientOptions) {
    super(options);
    if (!process.env.CLIENT_ID) {
      throw new Error("You must put the client ID to the env file.");
    }
    this.clientId = process.env.CLIENT_ID;
    this.commands = new Collection<string, CommandObject>();
    this.connection = new DefaultConnection();
    this.logger = new Logger("BOT");

    this.logger.log("Creating client");
  }

  public async existingGuildCheck() {
    const guildList = await this.guilds.fetch();

    for (const guildId of guildList.keys()) {
      if (!Database.guildList.includes(guildId)) {
        Database.add(guildId);

        this.logger.log(`Added existing guild ${guildId} to the database`);
      }
    }
  }

  public readCommands() {
    const commandsPath = path.join(rootPath, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file: string) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      // Set a new item in the Collection with the key as the command name and the value as the exported module
      "name" in command && "data" in command && "execute" in command
        ? this.commands.set(command.name, command)
        : this.logger.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
    }
  }

  public refreshCommands() {
    try {
      const rest = new REST().setToken(process.env.TOKEN!);

      this.logger.log(`Started refreshing application (/) commands`);

      Database.guildList.forEach((guildId) => {
        const guildCommands = this.commands.map((command) =>
          command.data(guildId).toJSON()
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        rest
          .put(Routes.applicationGuildCommands(this.clientId, guildId), {
            body: guildCommands,
          })
          .then((data) => {
            const refreshed = data as Object[];
            this.logger.log(
              `Successfully reloaded ${refreshed.length} application (/) commands to server ${guildId}`
            );
          });
      });
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      this.logger.error(error);
    }
  }

  public getCommand(commandName: string | undefined) {
    return commandName ? this.commands.get(commandName) : undefined;
  }

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
