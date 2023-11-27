import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

module.exports = {
  name: "ping",
  data: (guildId: string) =>
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Replies with Pong!"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Pong!");
    await interaction.editReply("Pong again!");
  },
};
