import {
  Client,
  Collection,
  Routes,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";
const rootPath = path.dirname(path.dirname(__filename));

interface CommandObject {
  name: string;
  execute(): void;
}

function readCommands() {
  const commandsPath = path.join(rootPath, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file: string) => file.endsWith(".js"));

  let commands = {
    collection: new Collection(),
    list: new Array<RESTPostAPIChatInputApplicationCommandsJSONBody>(),
  };

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      commands.collection.set(command.data.name, command);
      commands.list.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }

  return commands;
}

async function refreshCommands(
  commands: Array<RESTPostAPIChatInputApplicationCommandsJSONBody>
) {
  try {
    const rest = new REST().setToken(process.env.TOKEN!);

    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data: unknown = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data?.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
}

function initEvent(client: Client) {
  const eventsPath = path.join(rootPath, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file: string) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

export { readCommands, refreshCommands, initEvent };
