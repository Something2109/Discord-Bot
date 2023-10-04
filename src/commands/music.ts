import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import {
  entersState,
  joinVoiceChannel,
  PlayerSubscription,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Updater } from "../utils/Updater";
import { Player } from "../utils/Player";
import { createMessage } from "../utils/utils";

type InteractionType = ChatInputCommandInteraction;

enum Subcommand {
  Add = "add",
  Remove = "remove",
  Leave = "leave",
  Skip = "skip",
  Stop = "stop",
  List = "list",
  ClearQueue = "clearqueue",
  Pause = "pause",
  Unpause = "unpause",
  Loop = "loop",
  Unloop = "unloop",
}

const description: { [key in Subcommand]: string } = {
  [Subcommand.Add]: "Add a song to the player queue",
  [Subcommand.Remove]: "Remove the specified song from the queue",
  [Subcommand.Leave]: "Force the player to leave channel",
  [Subcommand.Skip]: "Skip to the next songs in the queue",
  [Subcommand.Stop]: "Stop the player",
  [Subcommand.List]: "List the songs in the player queue",
  [Subcommand.ClearQueue]: "Clear the player queue",
  [Subcommand.Pause]: "Pause the player",
  [Subcommand.Unpause]: "Unpause the player",
  [Subcommand.Loop]: "Loop the playing song",
  [Subcommand.Unloop]: "Continue to play the next song in the queue",
};

const data = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Play music")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Add)
      .setDescription(description[Subcommand.Add])
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The Youtube url")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Remove)
      .setDescription(description[Subcommand.Remove])
      .addNumberOption((option) =>
        option
          .setName("number")
          .setDescription("The place of the song in the queue")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Leave)
      .setDescription(description[Subcommand.Leave])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Skip)
      .setDescription(description[Subcommand.Skip])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Stop)
      .setDescription(description[Subcommand.Stop])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.List)
      .setDescription(description[Subcommand.List])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.ClearQueue)
      .setDescription(description[Subcommand.ClearQueue])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Pause)
      .setDescription(description[Subcommand.Pause])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Unpause)
      .setDescription(description[Subcommand.Unpause])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Loop)
      .setDescription(description[Subcommand.Loop])
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Unloop)
      .setDescription(description[Subcommand.Unloop])
  );

const updater = new Updater();
const player = new Player(updater);
let connection: VoiceConnection | undefined = undefined;
let subscription: PlayerSubscription | undefined = undefined;

/**
 * Create a connection to the voice channer the user is in.
 * @param channel The channel the user is in.
 */
function joinVoice(channel: VoiceBasedChannel) {
  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });
  connection.on("stateChange", (oldState, newState) => {
    console.log(
      `Connection transitioned from ${oldState.status} to ${newState.status}`
    );
  });
  connection.on(
    VoiceConnectionStatus.Disconnected,
    async (oldState, newState) => {
      try {
        await Promise.race([
          entersState(connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        console.log(error);
        await leave();
      }
    }
  );

  subscription = connection.subscribe(player.audioPlayer);
}

/**
 * Check the voice connection of the user create the command.
 * If there is no voice connection then notify user to join one.
 * If in the different channel then leave the old connection and join the new one.
 * @param interaction The interaction command.
 * @returns True if the user has voice connection else false.
 */
async function connect(interaction: InteractionType): Promise<boolean> {
  const member = interaction.member as GuildMember;
  const userVoiceChannel = member.voice.channel;
  if (userVoiceChannel) {
    if (!connection) {
      joinVoice(userVoiceChannel);
    } else if (userVoiceChannel.id !== connection.joinConfig.channelId) {
      subscription?.unsubscribe();
      connection.destroy();
      joinVoice(userVoiceChannel);
    }
    return true;
  }
  return false;
}

/**
 * Disconnect the connection to the current voice channel.
 * Clear the player queue.
 * @returns The reply string.
 */
async function leave() {
  player.stop();
  subscription?.unsubscribe();
  subscription = undefined;

  connection?.destroy();
  connection = undefined;

  return "Left the voice channel";
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Add]: async (interaction) => {
    const url = interaction.options.getString("url");
    const reply = await player.add(url);
    return createMessage({ title: reply, url: url ? url : undefined });
  },
  [Subcommand.Remove]: async (interaction) => {
    const number = interaction.options.getNumber("number");
    const reply = player.remove(number!);
    return createMessage({ title: reply });
  },
  [Subcommand.Leave]: async (interaction) => {
    let reply = await leave();
    return createMessage({ title: reply });
  },
  [Subcommand.Skip]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Skip]() });
  },
  [Subcommand.Stop]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Stop]() });
  },
  [Subcommand.List]: async (interaction) => {
    const reply = "List of songs in the queue";
    const queue = player.list();
    return createMessage({ title: reply, field: queue });
  },
  [Subcommand.ClearQueue]: async (interaction) => {
    return createMessage({ title: player[Subcommand.ClearQueue]() });
  },
  [Subcommand.Pause]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Pause]() });
  },
  [Subcommand.Unpause]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Unpause]() });
  },
  [Subcommand.Loop]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Loop]() });
  },
  [Subcommand.Unloop]: async (interaction) => {
    return createMessage({ title: player[Subcommand.Unloop]() });
  },
};

/**
 * The main executioner of this command.
 * @param interaction The interaction object.
 */
async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  updater.channel = interaction.channel as TextBasedChannel;
  const status = await connect(interaction);

  const subcommand = interaction.options.getSubcommand() as Subcommand;
  const message: BaseMessageOptions = status
    ? await executor[subcommand](interaction)
    : createMessage({
        title: "You need to join a voice channel to play the music",
      });
  await interaction.editReply(message);
}

export { data, execute };
