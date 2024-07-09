import { Events, BaseInteraction } from "discord.js";
import { CustomClient } from "../utils/Client";
import { CommandLoader } from "../utils/controller/Loader";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;

      const client = interaction.client as CustomClient;
      const user = interaction.user.displayName;
      const guild = interaction.guild?.name ?? "direct message";

      const command = CommandLoader.discord.get(commandName);
      client.logger.log(
        `Executing ${command?.name} sent by ${user} in ${guild}.`
      );

      try {
        await command?.execute(interaction);
      } catch (error) {
        client.logger.error(`Error executing ${commandName}`);
        interaction.editReply(`Error executing ${commandName}`);
        console.error(error);
      }
    }
  },
};
