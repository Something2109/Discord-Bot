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
} from "discord.js";
import { Server, ServerStatus } from "../utils/Server";
import { Ngrok, NgrokTunnel } from "../utils/Ngrok";
import { createMessage } from "../utils/utils";

type InteractionType = ChatInputCommandInteraction | ButtonInteraction;

enum Subcommand {
  Start = "start",
  Stop = "stop",
  Status = "status",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Start]: "Start the minecraft server",
  [Subcommand.Stop]: "Stop the minecraft server",
  [Subcommand.Status]: "Show the status of the minecraft server",
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
};

let previousMsg: Message | undefined = undefined;
const server = new Server();
const ngrok = new Ngrok();

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
 * Test the connection after starting or stopping the server.
 * @param {} interaction
 * The interaction object.
 */
function testConnection(
  interaction: InteractionType,
  onSuccess: string,
  onFail: string,
  status: ServerStatus
) {
  let remainTestTime = parseInt(process.env.SERVER_TEST_TIME!);
  let connectionTest = setInterval(() => {
    server.status().then((res) => {
      if (res == ServerStatus.Starting) {
        return;
      } else if (res !== status && remainTestTime > 0) {
        remainTestTime--;
      } else {
        interaction
          .followUp(
            createMessage({
              title: "Test connection:",
              description: res === status ? onSuccess : onFail,
              actionRow: getButton(res),
            })
          )
          .then((message) => (previousMsg = message));
        clearInterval(connectionTest);
      }
    });
  }, parseInt(process.env.SERVER_TEST_INTERVAL!));
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType
  ) => Promise<[ServerStatus, NgrokTunnel?]>;
} = {
  [Subcommand.Start]: async (interaction: InteractionType) => {
    const status = await Promise.all([server.start(), ngrok.start()]);
    if (status[0] == ServerStatus.Starting) {
      testConnection(
        interaction,
        `Server starts successfully`,
        `Server fails to start in the test`,
        ServerStatus.Online
      );
    }
    return status;
  },
  [Subcommand.Stop]: async (interaction) => {
    const status = await Promise.all([server.stop(), ngrok.stop()]);
    if (status[0] == ServerStatus.Starting) {
      testConnection(
        interaction,
        `Server stops successfully`,
        `Server fails to stop in the test`,
        ServerStatus.Offline
      );
    }
    return status;
  },
  [Subcommand.Status]: async (interaction) => {
    return await Promise.all([server.status(), ngrok.status()]);
  },
};

async function execute(interaction: InteractionType) {
  await previousMsg?.edit({
    components: [],
  });

  await interaction.deferReply();

  let subcommand = getSubcommand(interaction);
  let [status, tunnel] = await executor[subcommand](interaction);

  previousMsg = await interaction.editReply(
    getReply(subcommand, status, tunnel)
  );
}

export { data, execute };
