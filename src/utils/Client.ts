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
const rootPath = path.dirname(path.dirname(__filename));

interface CommandObject {
  data: SlashCommandBuilder;
  execute(interaction: any): Promise<void>;
}

class CustomClient extends Client {
  private commands: Collection<string, CommandObject>;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection<string, CommandObject>();
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
      "data" in command && "execute" in command
        ? this.commands.set(command.data.name, command)
        : console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
    }
  }

  async refreshCommands() {
    try {
      const rest = new REST().setToken(process.env.TOKEN!);
      const commands = this.commands.map((command) => command.data.toJSON());

      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );

      // The put method is used to fully refresh all commands in the guild with the current set
      const data: Array<Object> = (await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID!,
          process.env.GUILD_ID!
        ),
        { body: commands }
      )) as Array<Object>;

      console.log(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      console.error(error);
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
