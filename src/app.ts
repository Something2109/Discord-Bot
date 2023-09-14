require("dotenv").config();
import { CustomClient } from "./utils/utils";
import { GatewayIntentBits } from "discord.js";

// Create a new client instance
const client = new CustomClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.readCommands();
client.refreshCommands();
client.initiateEvent();

// Log in to Discord with your client's token
client.login(process.env.TOKEN);
