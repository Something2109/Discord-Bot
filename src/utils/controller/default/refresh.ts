import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandLoader } from "../Loader";
import { Database } from "../../database/Database";

const discord = {
  name: "refresh",
  data: () =>
    new SlashCommandBuilder()
      .setName("refresh")
      .setDescription("Refresh the command list."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Start refreshing commands.");

    Database.initiate();
    CommandLoader.initiate();

    for (const guildId in Database.guilds) {
      CommandLoader.updateCommands(guildId);
    }

    await interaction.editReply("Successfully refresh commands.");
  },
};

const cli = {
  name: "refresh",
  help: () => `refresh: Refresh the command list and their functionalities.`,
  execute: async () => {
    Database.initiate();
    CommandLoader.initiate();

    for (const guildId in Database.guilds) {
      CommandLoader.updateCommands(guildId);
    }

    return "Finish reloading commands";
  },
};

export { discord, cli };
