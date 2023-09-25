import {
  APIEmbedField,
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

const data = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Play music")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Add)
      .setDescription("Add a song to the player queue")
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
      .setDescription("Remove the specified song from the queue")
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
      .setDescription("Force the player to leave channel")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Skip)
      .setDescription("Skip to the next songs in the queue")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommand.Stop).setDescription("Stop the player")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.List)
      .setDescription("List the songs in the player queue")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.ClearQueue)
      .setDescription("Clear the player queue")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommand.Pause).setDescription("Pause the player")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommand.Unpause).setDescription("Unpause the player")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommand.Loop).setDescription("Loop the playing song")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Unloop)
      .setDescription("Continue to play the next song in the queue")
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
async function connect(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const member = interaction.member as GuildMember;
  const userVoiceChannel = member.voice.channel;
  if (!userVoiceChannel) {
    await interaction.editReply(
      createMessage("You need to join a voice channel to play the music")
    );
  } else {
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

/**
 * The main executioner of this command.
 * @param interaction The interaction object.
 */
async function execute(interaction: ChatInputCommandInteraction) {
  let subcommand = interaction.options.getSubcommand() as Subcommand;
  updater.channel = interaction.channel as TextBasedChannel;

  await interaction.deferReply();
  const status = await connect(interaction);
  if (status) {
    switch (subcommand) {
      case Subcommand.Add: {
        const url = interaction.options.getString("url");
        const reply = await player.add(url);
        await interaction.editReply(
          createMessage(reply, url ? url : undefined)
        );
        break;
      }
      case Subcommand.Remove: {
        const number = interaction.options.getNumber("number");
        const reply = player.remove(number!);
        await interaction.editReply(createMessage(reply));
        break;
      }
      case Subcommand.List: {
        const reply = "List of songs in the queue";
        const queue = player.list();
        await interaction.editReply(
          createMessage(reply, undefined, undefined, queue)
        );
        break;
      }
      case Subcommand.Leave: {
        let reply = await leave();
        await interaction.editReply(createMessage(reply));
        break;
      }
      default: {
        await interaction.editReply(createMessage(player[subcommand]()));
      }
    }
  }
}

export { data, execute };
