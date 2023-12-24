require("dotenv").config();
import { CustomClient } from "./utils/Client";
import { GatewayIntentBits } from "discord.js";

// Create a new client instance
const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.readCommands();
client.initiateEvent();

// Log in to Discord with your client's token
client.login(process.env.TOKEN);

client.existingGuildCheck().then(client.refreshCommands.bind(client));
