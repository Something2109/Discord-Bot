import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandLoader } from "../utils/controller/Loader";
import { CustomClient } from "../utils/Client";

const discord = {
  name: "refresh",
  data: (guildId: string) =>
    new SlashCommandBuilder()
      .setName("refresh")
      .setDescription("Refresh the command list."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Start refreshing commands.");

    CommandLoader.initiate();

    const client = interaction.client as CustomClient;
    client.refreshCommandsAll();

    await interaction.editReply("Successfully refresh commands.");
  },
};

const cli = {
  name: "refresh",
  help: () => `refresh: Refresh the command list and their functionalities.`,
  execute: async () => {
    CommandLoader.initiate();

    return "Finish reloading commands";
  },
};

export { discord, cli };
