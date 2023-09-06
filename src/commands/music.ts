import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from "discord.js";
import {
  entersState,
  joinVoiceChannel,
  PlayerSubscription,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Player } from "../utils/Player";

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
}

const player = new Player();
let connection: VoiceConnection | undefined = undefined;
let subscription: PlayerSubscription | undefined = undefined;

const data = new SlashCommandBuilder()
  .setName("music")
  .setDescription("Play music")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommand.Add)
      .setDescription("Add a song to the player queue")
      .addStringOption((option) =>
        option.setName("url").setDescription("The Youtube url")
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
  );

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
      if (connection) {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          console.log(error);
          await leave();
        }
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
  if (interaction.member) {
    const userVoiceChannel = interaction.member.voice.channel;
    if (!userVoiceChannel) {
      await interaction.reply(
        "You need to join a voice channel to play the music"
      );
    } else {
      if (!connection) {
        joinVoice(userVoiceChannel);
      } else if (
        subscription &&
        userVoiceChannel.id !== connection.joinConfig.channelId
      ) {
        subscription.unsubscribe();
        connection.destroy();
        joinVoice(userVoiceChannel);
      }
      return true;
    }
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
  if (subscription) {
    subscription.unsubscribe();
    subscription = undefined;
  }

  if (connection) {
    connection.destroy();
    connection = undefined;
  }

  return "Left the voice channel";
}

/**
 * The main executioner of this command.
 * @param interaction The interaction object.
 */
async function execute(interaction: ChatInputCommandInteraction) {
  let subcommand = interaction.options.getSubcommand() as Subcommand;
  const status = await connect(interaction);
  if (status) {
    switch (subcommand) {
      case Subcommand.Add: {
        const url = interaction.options.getString("url");
        const reply = await player.add(url, interaction.channel!);
        await interaction.reply(reply);
        break;
      }
      case Subcommand.Remove: {
        const number = interaction.options.getNumber("number");
        const reply = player.remove(number!);
        await interaction.reply(reply);
        break;
      }
      case Subcommand.Leave: {
        let reply = await leave();
        await interaction.reply(reply);
        break;
      }
      default: {
        await interaction.reply(player[subcommand]());
      }
    }
  }
}

module.exports = {
  data: data,
  execute,
};
