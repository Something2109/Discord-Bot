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
import { Server, ServerStatus } from "../utils/mc-server/Server";
import { Ngrok, NgrokTunnel } from "../utils/mc-server/Ngrok";
import { MessageAPI, createMessage } from "../utils/utils";
import { ServerUpdater } from "../utils/Updater";

type InteractionType = ChatInputCommandInteraction | ButtonInteraction;

let previousMsg: Message | undefined = undefined;
const updater: ServerUpdater = new ServerUpdater();
const server = new Server();
const ngrok = new Ngrok();

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
  status: ServerStatus,
  tunnel?: NgrokTunnel
): BaseMessageOptions {
  let serverReply: APIEmbedField = {
    name: "Minecraft server:",
    value: reply[subcommand][status],
  };
  let ngrokReply: APIEmbedField = {
    name: "Ngrok",
    value: tunnel
      ? `Ngrok running at ${tunnel.public_url}`
      : `Ngrok is not running`,
  };

  return createMessage({
    title: `Command ${subcommand}:`,
    field: [serverReply, ngrokReply],
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

/**
 * Used to test the connection of the server.
 * @param onSuccess The message to send if success.
 * @param onFail The message to send if fail.
 * @param status The status to test.
 */
function testConnection(
  onSuccess: string,
  onFail: string,
  status: ServerStatus
) {
  let remainTestTime = parseInt(process.env.SERVER_TEST_TIME!);
  remainTestTime ??= 10;
  let testInterval = parseInt(process.env.SERVER_TEST_INTERVAL!);
  testInterval ??= 2000;

  let connectionTest = setInterval(() => {
    server.status().then((res) => {
      if (res == ServerStatus.Starting) {
        return;
      } else if (res !== status && remainTestTime > 0) {
        remainTestTime--;
      } else {
        updater
          .send({
            title: "Test connection:",
            description: res === status ? onSuccess : onFail,
            actionRow: getButton(res),
          })
          .then((message) => (previousMsg = message));
        clearInterval(connectionTest);
      }
    });
  }, testInterval);
}

const executor: {
  [key in Subcommand]: (subcommand: Subcommand) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Start]: async (subcommand) => {
    const [status, tunnel] = await Promise.all([
      server.start(updater),
      ngrok.start(),
    ]);
    if (status == ServerStatus.Starting) {
      testConnection(
        `Server starts successfully`,
        `Server fails to start in the test`,
        ServerStatus.Online
      );
    }
    return getReply(subcommand, status, tunnel);
  },
  [Subcommand.Stop]: async (subcommand) => {
    const [status, tunnel] = await Promise.all([server.stop(), ngrok.stop()]);
    if (status == ServerStatus.Starting) {
      testConnection(
        `Server stops successfully`,
        `Server fails to stop in the test`,
        ServerStatus.Offline
      );
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
  [Subcommand.List]: async (subcommand): Promise<BaseMessageOptions> => {
    const status = await server.status();
    let message: MessageAPI = {
      title: reply[subcommand][status],
      actionRow: getButton(status),
    };
    if (status == ServerStatus.Online && server.list.length > 0) {
      message.field = server.list;
    }
    return createMessage(message);
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
