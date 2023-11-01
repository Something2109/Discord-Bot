import {
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  ChatInputCommandInteraction,
  ButtonInteraction,
  BaseMessageOptions,
  APIEmbedField,
  ActionRowBuilder,
  TextBasedChannel,
} from "discord.js";
import { DefaultServer, Server, ServerStatus } from "../utils/mc-server/Server";
import { Updater, DefaultUpdater, MessageAPI } from "../utils/Updater";

type InteractionType = ChatInputCommandInteraction | ButtonInteraction;

let previousMsg: Message | undefined = undefined;
const updater: Updater = new DefaultUpdater("Minecraft Server");
const server: Server = new DefaultServer(updater);

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

const buttons = {
  [Subcommand.Start]: new ButtonBuilder()
    .setCustomId(`${data.name} ${Subcommand.Start}`)
    .setLabel("Start")
    .setStyle(ButtonStyle.Success),
  [Subcommand.Stop]: new ButtonBuilder()
    .setCustomId(`${data.name} ${Subcommand.Stop}`)
    .setLabel("Stop")
    .setStyle(ButtonStyle.Danger),
  [Subcommand.Status]: new ButtonBuilder()
    .setCustomId(`${data.name} ${Subcommand.Status}`)
    .setLabel("Status")
    .setStyle(ButtonStyle.Secondary),
  [Subcommand.List]: new ButtonBuilder()
    .setCustomId(`${data.name} ${Subcommand.List}`)
    .setLabel("List")
    .setStyle(ButtonStyle.Secondary),
};

/**
 * Get the subcommand to progress to the server.
 * @param interaction
 * @returns The needed subcommand.
 */
function getSubcommand(interaction: InteractionType): Subcommand {
  let subcommand: string = Subcommand.Status;
  if (interaction.isChatInputCommand()) {
    subcommand = interaction.options.getSubcommand();
  } else if (interaction.isButton()) {
    [, subcommand] = interaction.customId.split(" ");
  }
  console.log(`[CMD]: Executing command mc-server ${subcommand}`);
  return subcommand as Subcommand;
}

/**
 * Get the reply to a specific command.
 * @param subcommand The subcommand of the interaction.
 * @param status Current status of the server.
 * @param tunnel The Ngrok tunnel.
 * @returns The reply string.
 */
function getReply(
  subcommand: Subcommand,
  status: ServerStatus
): BaseMessageOptions {
  let serverReply: APIEmbedField = {
    name: `Command ${subcommand}:`,
    value: reply[subcommand][status],
  };

  return updater.message({
    description: server.host,
    field: [serverReply],
    actionRow: getButton(status),
  });
}

/**
 * Create the button row based on the status of the server.
 * @param status Current status of the server.
 * @returns The action row contains the buttons.
 */
function getButton(status: ServerStatus): ActionRowBuilder | undefined {
  if (status == ServerStatus.Online) {
    return new ActionRowBuilder().addComponents(
      buttons[Subcommand.Status],
      buttons[Subcommand.List],
      buttons[Subcommand.Stop]
    );
  } else if (status == ServerStatus.Offline) {
    return new ActionRowBuilder().addComponents(
      buttons[Subcommand.Start],
      buttons[Subcommand.Status]
    );
  } else {
    return undefined;
  }
}

const executor: {
  [key in Subcommand]: (subcommand: Subcommand) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (subcommand) => {
    const status = await server.start();
    return getReply(subcommand, status);
  },
  [Subcommand.Stop]: async (subcommand) => {
    const status = await server.stop();

    return getReply(subcommand, status);
  },
  [Subcommand.Status]: async (subcommand) => {
    const status = await server.status();
    return getReply(subcommand, status);
  },
  [Subcommand.List]: async (subcommand): Promise<BaseMessageOptions> => {
    const status = await server.status();
    let message: MessageAPI = {
      description: reply[subcommand][status],
      actionRow: getButton(status),
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
  await previousMsg?.edit({
    components: [],
  });

  await interaction.deferReply();

  updater.channel = interaction.channel as TextBasedChannel;

  const subcommand = getSubcommand(interaction);
  const message = await executor[subcommand](subcommand);

  previousMsg = await interaction.editReply(message);
}

export { data, execute };
