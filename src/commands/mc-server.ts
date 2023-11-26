import {
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  BaseMessageOptions,
  APIEmbedField,
  TextBasedChannel,
} from "discord.js";
import { DefaultServer, Server, ServerStatus } from "../utils/mc-server/Server";
import { DefaultNgrok, Ngrok, NgrokTunnel } from "../utils/mc-server/Ngrok";
import { Updater, DefaultUpdater, MessageAPI } from "../utils/Updater";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Minecraft Server");
const server: Server = new DefaultServer(updater);
const ngrok: Ngrok = new DefaultNgrok();

enum Subcommand {
  Start = "start",
  Stop = "stop",
  Status = "status",
  List = "list",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Start]: "Start the minecraft server",
  [Subcommand.Stop]: "Stop the minecraft server",
  [Subcommand.Status]: "Show the status of the minecraft server",
  [Subcommand.List]: "List the players are playing in the server",
};

const reply: { [key in Subcommand]: { [key in ServerStatus]: string } } = {
  [Subcommand.Start]: {
    [ServerStatus.Online]: "Server has already started",
    [ServerStatus.Offline]: "Failed to start server",
    [ServerStatus.Starting]: "Server is starting",
  },
  [Subcommand.Stop]: {
    [ServerStatus.Online]: "Failed to stop server",
    [ServerStatus.Offline]: "Server has already stopped",
    [ServerStatus.Starting]: "Server is stopping",
  },
  [Subcommand.Status]: {
    [ServerStatus.Online]: "Server is running",
    [ServerStatus.Offline]: "Server is not running",
    [ServerStatus.Starting]: "Server is starting or stopping",
  },
  [Subcommand.List]: {
    [ServerStatus.Online]: "List of player",
    [ServerStatus.Offline]: "Server is not running",
    [ServerStatus.Starting]: "Server is starting or stopping",
  },
};

const data = new SlashCommandBuilder()
  .setName("mc-server")
  .setDescription("Minecraft server command")
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Start)
      .setDescription(description[Subcommand.Start])
  )
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Stop)
      .setDescription(description[Subcommand.Stop])
  )
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Status)
      .setDescription(description[Subcommand.Status])
  )
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.List)
      .setDescription(description[Subcommand.List])
  );

/**
 * Get the reply to a specific command.
 * @param subcommand The subcommand of the interaction.
 * @param status Current status of the server.
 * @returns The reply string.
 */
function getReply(
  subcommand: Subcommand,
  status: ServerStatus,
  tunnel?: NgrokTunnel
): BaseMessageOptions {
  let serverReply: APIEmbedField = {
    name: "Minecraft server:",
    value: reply[subcommand][status],
  };
  let ngrokReply: APIEmbedField = {
    name: "Ngrok",
    value: `Ngrok is not running`,
  };

  if (tunnel) {
    if (ngrok.isMcTunnel(tunnel)) {
      ngrokReply.value = `Ngrok running at ${tunnel.public_url}`;
    } else {
      ngrokReply.value = "Another application is using Ngrok now";
    }
  }

  return updater.message({
    description: `Command ${subcommand}:`,
    field: [serverReply, ngrokReply],
  });
}

const executor: {
  [key in Subcommand]: (subcommand: Subcommand) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (subcommand) => {
    const [status, tunnel] = await Promise.all([server.start(), ngrok.start()]);
    return getReply(subcommand, status, tunnel);
  },
  [Subcommand.Stop]: async (subcommand) => {
    let [status, tunnel] = await Promise.all([server.stop(), ngrok.status()]);
    if (ngrok.isMcTunnel(tunnel)) {
      tunnel = await ngrok.stop();
    }
    return getReply(subcommand, status, tunnel);
  },
  [Subcommand.Status]: async (subcommand) => {
    const [status, tunnel] = await Promise.all([
      server.status(),
      ngrok.status(),
    ]);
    return getReply(subcommand, status, tunnel);
  },
  [Subcommand.List]: async (subcommand) => {
    const status = await server.status();
    let message: MessageAPI = {
      description: reply[subcommand][status],
    };
    if (server.list.length > 0) {
      message.field = server.list.map((player) => {
        return {
          name: player.name,
          value: `Time joined: ${player.time.toLocaleString()}`,
        };
      });
    }
    return updater.message(message);
  },
};

async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  updater.channel = interaction.channel as TextBasedChannel;

  const subcommand = interaction.options.getSubcommand() as Subcommand;
  const message = await executor[subcommand](subcommand);

  await interaction.editReply(message);
}

export { data, execute };
