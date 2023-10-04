import { Events, BaseInteraction } from "discord.js";
import { CustomClient } from "../utils/Client";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    let commandName = undefined;

    if (interaction.isChatInputCommand()) {
      commandName = interaction.commandName;
    } else if (interaction.isButton()) {
      [commandName] = interaction.customId.split(" ");
    }

    const client = interaction.client as CustomClient;
    let command = client.getCommand(commandName);

    try {
      await command?.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${commandName}`);
      console.error(error);
    }
  },
};
