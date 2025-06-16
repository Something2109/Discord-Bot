require("dotenv").config();
import { ConsoleClient, CustomClient } from "./utils/Client";
import { GatewayIntentBits } from "discord.js";
import { CommandLoader } from "./utils/controller/Loader";
import path from "node:path";
import { Database } from "./utils/database/Database";
import { ConsoleLineInterface } from "./utils/Console";

CommandLoader.use(path.join(__dirname, "commands"));

const console = new ConsoleClient();

ConsoleLineInterface.addCommandListener(console.execute.bind(console));

// Create a new client instance
const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.initiateEvent();

// Log in to Discord with your client's token
client.login(process.env.TOKEN);

client.existingGuildCheck().then(() => {
  for (const guildId in Database.guilds) {
    CommandLoader.updateCommands(guildId);
  }
});
