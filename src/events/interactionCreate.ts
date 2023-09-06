import { Events, BaseInteraction } from "discord.js";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    let commandName = undefined;

    if (interaction.isChatInputCommand()) {
      commandName = interaction.commandName;
    } else if (interaction.isButton()) {
      [commandName] = interaction.customId.split(" ");
    }

    let command = interaction.client.commands.get(commandName);

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${commandName}`);
      console.error(error);
    }
  },
};
