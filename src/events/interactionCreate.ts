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
    client.logger.log(`Executing ${commandName}`);
    let command = client.getCommand(commandName);

    try {
      await command?.execute(interaction);
    } catch (error) {
      client.logger.error(`Error executing ${commandName}`);
      if (interaction.isChatInputCommand() || interaction.isButton()) {
        interaction.editReply(`Error executing ${commandName}`);
      }
      console.error(error);
    }
  },
};
