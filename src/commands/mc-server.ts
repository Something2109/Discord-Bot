import {
  SlashCommandSubcommandBuilder,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";
import { Server, ServerStatus } from "../utils/Server";
import { Ngrok, NgrokTunnel } from "../utils/Ngrok";

enum Subcommand {
  Start = "start",
  Stop = "stop",
  Status = "status",
}

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
      .setDescription("Start the minecraft server")
  )
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Stop)
      .setDescription("Stop the minecraft server")
  )
  .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName(Subcommand.Status)
      .setDescription("Show the status of the minecraft server")
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
function getSubcommand(
  interaction: ChatInputCommandInteraction | ButtonInteraction
): Subcommand {
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
 * Execute the command to the server and Ngrok.
 * @param subcommand The subcommand of the interaction.
 * @returns The result of the command to the server and Ngrok.
 */
async function executeSubcommand(
  subcommand: string | undefined
): Promise<{ status: ServerStatus; tunnel: NgrokTunnel | undefined }> {
  let status = ServerStatus.Starting;
  let tunnel = undefined;
  switch (subcommand) {
    case Subcommand.Start: {
      status = await server.start();
      tunnel = await ngrok.start();
      break;
    }
    case Subcommand.Status: {
      status = await server.status();
      tunnel = await ngrok.status();
      break;
    }
    case Subcommand.Stop: {
      status = await server.status();
      tunnel = await ngrok.status();
      break;
    }
  }
  return { status, tunnel };
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
  tunnel: NgrokTunnel | undefined
) {
  let serverReply = reply[subcommand][status];
  let ngrokReply = `Ngrok is not running`;

  if (tunnel) {
    ngrokReply = `Ngrok running at ${tunnel.public_url}`;
  }

  return `${serverReply}\n${ngrokReply}`;
}

/**
 * Test the connection after starting or stopping the server.
 * @param {} interaction
 * The interaction object.
 */
function testConnection(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  onSuccess: string,
  onFail: string,
  status: ServerStatus
) {
  let remainTestTime = parseInt(process.env.SERVER_TEST_TIME!);
  let connectionTest = setInterval(() => {
    server.status().then((res) => {
      if (res == undefined) {
        return;
      } else if (res !== status && remainTestTime > 0) {
        remainTestTime--;
      } else {
        interaction
          .followUp({
            content: res === status ? onSuccess : onFail,
          })
          .then((message) => (previousMsg = message));
        clearInterval(connectionTest);
      }
    });
  }, parseInt(process.env.SERVER_TEST_INTERVAL!));
}

async function execute(
  interaction: ChatInputCommandInteraction | ButtonInteraction
) {
  if (previousMsg) {
    await previousMsg.edit({
      components: [],
    });
  }

  await interaction.deferReply();

  let subcommand = getSubcommand(interaction);
  let { status, tunnel } = await executeSubcommand(subcommand);

  previousMsg = await interaction.editReply({
    content: getReply(subcommand, status, tunnel),
  });

  if (
    (subcommand == Subcommand.Start || subcommand == Subcommand.Stop) &&
    status == ServerStatus.Starting
  ) {
    testConnection(
      interaction,
      `Server ${subcommand}s successfully`,
      `Server fails to ${subcommand} in the test`,
      subcommand == "start" ? ServerStatus.Online : ServerStatus.Offline
    );
  }
}

export { data, execute };
