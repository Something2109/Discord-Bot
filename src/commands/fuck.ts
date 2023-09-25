import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("fuck")
  .setDescription("Fuck sth")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("user")
      .setDescription("Fuck a user")
      .addUserOption((option) =>
        option.setName("target").setDescription("The user")
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("server").setDescription("Fuck the server")
  );

module.exports = {
  data: data,
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() === "user") {
      const target = interaction.options.getUser("target");
      target
        ? await interaction.reply(`Fuck ${target}`)
        : await interaction.reply(`Go fuck yourself, ${interaction.user}`);
    } else {
      await interaction.reply(`Fuck ${interaction.guild!.name}`);
    }
  },
};
