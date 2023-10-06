import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { Ngrok } from "../utils/mc-server/Ngrok";
import { createMessage } from "../utils/utils";

type InteractionType = ChatInputCommandInteraction;

const ngrok = new Ngrok();

enum Subcommand {
  Start = "start",
  Status = "status",
  Stop = "stop",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Start]: "Start a tunnel with the specific address.",
  [Subcommand.Status]: "Show the current tunnel with address.",
  [Subcommand.Stop]: "Stop the tunnel.",
};

const data = new SlashCommandBuilder()
  .setName("ngrok")
  .setDescription("Ngrok tunnel controller")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Start)
      .setDescription(description[Subcommand.Start])
      .addStringOption((option) =>
        option
          .setName("addr")
          .setDescription("The address of the port")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Stop)
      .setDescription(description[Subcommand.Stop])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Status)
      .setDescription(description[Subcommand.Status])
  );

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType,
    subcommand: Subcommand
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (interaction, subcommand) => {
    const address = interaction.options.getString("addr");
    const tunnel = address ? await ngrok.start(address) : undefined;
    const field =
      tunnel && tunnel.config.addr === address
        ? [
            {
              name: tunnel.public_url,
              value: tunnel.config.addr,
            },
          ]
        : undefined;
    return createMessage({
      title: `Command ngrok ${subcommand}`,
      description: tunnel
        ? tunnel.config.addr === address
          ? "Start tunnel successfully."
          : "Another program using tunnel right now."
        : "Cannot start tunnel.",
      field: field,
    });
  },
  [Subcommand.Status]: async (interaction, subcommand) => {
    const tunnel = await ngrok.status();
    const field = tunnel
      ? [
          {
            name: tunnel.public_url,
            value: tunnel.config.addr,
          },
        ]
      : undefined;
    return createMessage({
      title: `Command ngrok ${subcommand}`,
      description: tunnel ? undefined : "There's no tunnel running",
      field: field,
    });
  },
  [Subcommand.Stop]: async (interaction, subcommand) => {
    const tunnel = await ngrok.stop();
    const field = tunnel
      ? [
          {
            name: tunnel.public_url,
            value: tunnel.config.addr,
          },
        ]
      : undefined;
    return createMessage({
      title: `Command ngrok ${subcommand}`,
      description: tunnel
        ? "Cannot stop tunnel."
        : "Tunnel stops successfully.",
      field: field,
    });
  },
};

async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand() as Subcommand;

  const reply = await executor[subcommand](interaction, subcommand);
  await interaction.editReply(reply);
}

export { data, execute };
