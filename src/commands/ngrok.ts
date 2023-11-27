import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { DefaultNgrok, Ngrok, NgrokTunnel } from "../utils/mc-server/Ngrok";
import { DefaultUpdater, Updater } from "../utils/Updater";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Ngrok");
const ngrok: Ngrok = new DefaultNgrok();

const commandName = "ngrok";
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

const data = (guildId: string) =>
  new SlashCommandBuilder()
    .setName(commandName)
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

function getReply(
  tunnel: NgrokTunnel | undefined,
  onExist: string,
  onEmpty: string
): BaseMessageOptions {
  if (tunnel) {
    return updater.message({
      description: onExist,
      field: [
        {
          name: tunnel.public_url,
          value: tunnel.config.addr,
        },
      ],
    });
  }

  return updater.message({ description: onEmpty });
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (interaction) => {
    const address = interaction.options.getString("addr");
    const tunnel = address ? await ngrok.start(address) : undefined;

    return tunnel && tunnel.config.addr === address
      ? getReply(tunnel, "Start tunnel successfully.", "Cannot start tunnel.")
      : updater.message({
          description: tunnel
            ? "Another program is using tunnel right now"
            : "Cannot start tunnel.",
        });
  },
  [Subcommand.Status]: async (interaction) => {
    const tunnel = await ngrok.status();
    return getReply(tunnel, "Tunnel:", "There's no tunnel running");
  },
  [Subcommand.Stop]: async (interaction) => {
    const tunnel = await ngrok.stop();
    return getReply(
      tunnel,
      "Cannot stop tunnel.",
      "Tunnel stops successfully."
    );
  },
};

async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand() as Subcommand;

  const reply = await executor[subcommand](interaction);
  await interaction.editReply(reply);
}

export { commandName as name, data, execute };
