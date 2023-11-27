import {
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  BaseMessageOptions,
  APIEmbedField,
  TextBasedChannel,
} from "discord.js";
import { ServerStatus } from "../utils/mc-server/Server";
import {
  DefaultMultiWorldServer,
  MultiWorldServer,
} from "../utils/mc-server/WorldHandler";
import { Updater, DefaultUpdater, MessageAPI } from "../utils/Updater";
import { Database } from "../utils/database/Database";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Minecraft Server");
const server: MultiWorldServer = new DefaultMultiWorldServer(updater);

const commandName = "mc-server";
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

function data(guildId: string) {
  const command = new SlashCommandBuilder()
    .setName("mc-server")
    .setDescription("Minecraft server command")
    .addSubcommand((subcommand: SlashCommandSubcommandBuilder) => {
      subcommand = subcommand
        .setName(Subcommand.Start)
        .setDescription(description[Subcommand.Start]);
      const worldList = Database.get(guildId)?.world;
      if (worldList) {
        subcommand.addStringOption((option) =>
          option
            .setName("world")
            .setDescription("The world to load")
            .setChoices(...worldList.list)
        );
      }
      return subcommand;
    });

  command.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Stop)
      .setDescription(description[Subcommand.Stop])
  );

  command.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Status)
      .setDescription(description[Subcommand.Status])
  );

  command.addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.List)
      .setDescription(description[Subcommand.List])
  );

  return command;
}

/**
 * Get the reply to a specific command.
 * @param subcommand The subcommand of the interaction.
 * @param status Current status of the server.
 * @returns The reply string.
 */
function getReply(
  subcommand: Subcommand,
  status: ServerStatus
): BaseMessageOptions {
  let hostReply: APIEmbedField = {
    name: "Host:",
    value: server.host,
  };
  let worldReply: APIEmbedField = {
    name: "World:",
    value: server.currentWorld
      ? server.currentWorld
      : "No world is available now",
  };

  return updater.message({
    description: reply[subcommand][status],
    field: [hostReply, worldReply],
  });
}

/**
 * Check if this server is idle or running in current guild.
 * @param guildId The id of the guild.
 * @returns True if can else false
 */
async function isIdle(guildId: string | null) {
  const worldList = Database.get(guildId!)?.world;
  const status = await server.status();

  return !(
    status !== ServerStatus.Offline && !worldList?.getName(server.currentWorld!)
  );
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType,
    subcommand: Subcommand
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (interaction, subcommand) => {
    const worldList = Database.get(interaction.guildId!)?.world;
    const world = interaction.options.getString("world");

    if (world) {
      if (!worldList?.getName(world)) {
        return updater.message({
          description: "Input world is invalid to run",
        });
      }
      server.currentWorld = world!;
    } else if (
      server.currentWorld &&
      !worldList?.getName(server.currentWorld)
    ) {
      return updater.message({
        description: "Current world is invalid to run",
      });
    }

    const status = await server.start();
    return getReply(subcommand, status);
  },
  [Subcommand.Stop]: async (interaction, subcommand) => {
    const status = await server.stop();

    return getReply(subcommand, status);
  },
  [Subcommand.Status]: async (interaction, subcommand) => {
    const status = await server.status();

    return getReply(subcommand, status);
  },
  [Subcommand.List]: async (interaction, subcommand) => {
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

  const idle = await isIdle(interaction.guildId);
  let message: BaseMessageOptions;

  if (idle) {
    updater.channel = interaction.channel as TextBasedChannel;

    const subcommand = interaction.options.getSubcommand() as Subcommand;
    message = await executor[subcommand](interaction, subcommand);
  } else {
    message = updater.message({
      description: "Server is running in another guild.",
    });
  }

  await interaction.editReply(message);
}

export { commandName as name, data, execute };
