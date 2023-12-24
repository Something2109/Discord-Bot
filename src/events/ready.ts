import { Events, Client } from "discord.js";
import { CustomClient } from "../utils/Client";

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    const customClient = client as CustomClient;
    customClient.logger.log(`Ready! Logged in as ${client.user!.tag}`);
  },
};
