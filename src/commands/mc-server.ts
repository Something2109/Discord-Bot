import {
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  BaseMessageOptions,
  APIEmbedField,
  TextBasedChannel,
} from "discord.js";
import { DefaultServer, Server, ServerStatus } from "../utils/mc-server/Server";
import { Updater, DefaultUpdater, MessageAPI } from "../utils/Updater";
import { Database } from "../utils/database/Database";
import { WorldList } from "../utils/database/List/WorldList";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Minecraft Server");
const server: Server = new DefaultServer(updater);
let worldData: WorldList | undefined = undefined;

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
      const guildWorldList = Database.get(guildId)?.world;
      if (guildWorldList) {
        subcommand.addStringOption((option) =>
          option
            .setName("world")
            .setDescription("The world to load")
            .setChoices(...guildWorldList.worldList)
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
 * @param host The host of the server.
 * @returns The reply string.
 */
function getReply(
  subcommand: Subcommand,
  status: ServerStatus,
  host?: string
): BaseMessageOptions {
  const currentWorld = worldData?.get(server.world);
  const field: APIEmbedField[] = [
    {
      name: "World:",
      value: currentWorld?.name ?? "No world is available now",
    },
  ];

  if (status !== ServerStatus.Offline) {
    field.push({
      name: "Host:",
      value: host ?? "Ngrok is not running or being used by other application.",
    });
  }

  return updater.message({
    description: reply[subcommand][status],
    field,
  });
}

/**
 * Check if this server is idle or running in current guild.
 * @returns True if can else false
 */
async function isIdle() {
  const status = await server.status();

  return !(status !== ServerStatus.Offline && !worldData?.get(server.world));
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType,
    subcommand: Subcommand
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (interaction, subcommand) => {
    const world = interaction.options.getString("world");

    if (worldData) {
      let worldFolder =
        worldData.get(world)?.value ??
        worldData.get(server.world)?.value ??
        worldData.worldList[0]?.value;
      if (!worldFolder) {
        return updater.message({
          description: "No valid world is available run",
        });
      }

      server.world = worldFolder;
      const [status, host] = await Promise.all([server.start(), server.host()]);
      return getReply(subcommand, status, host);
    }

    return updater.message({
      description: "Current guild is not supported this function.",
    });
  },
  [Subcommand.Stop]: async (interaction, subcommand) => {
    let [status, host] = await Promise.all([server.stop(), server.host()]);
    return getReply(subcommand, status, host);
  },
  [Subcommand.Status]: async (interaction, subcommand) => {
    const [status, host] = await Promise.all([server.status(), server.host()]);
    return getReply(subcommand, status, host);
  },
  [Subcommand.List]: async (interaction, subcommand) => {
    const status = await server.status();
    let message: MessageAPI = {
      description: reply[subcommand][status],
    };
    if (server.playerList.length > 0) {
      message.field = server.playerList.map((player) => {
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
  worldData = Database.get(interaction.guildId!)?.world;

  const idle = await isIdle();
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
