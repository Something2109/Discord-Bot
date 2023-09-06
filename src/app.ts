require("dotenv").config();
import { readCommands, refreshCommands, initEvent } from "./utils/utils";

// Require the necessary discord.js classes
import { Client, GatewayIntentBits } from "discord.js";

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const commands = readCommands();
client.commands = commands.collection;

refreshCommands(commands.list);

initEvent(client);

// Log in to Discord with your client's token
client.login(process.env.TOKEN);
