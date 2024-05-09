import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Updater, DefaultUpdater } from "../utils/Updater";
import { AudioInfo, DefaultPlayer, Player } from "../utils/music/Player";
import { CustomClient } from "../utils/Client";

type InteractionType = ChatInputCommandInteraction;

const updater: Updater = new DefaultUpdater("Music Player");
const player: Player = new DefaultPlayer(updater);

const commandName = "music";
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

const data = (guildId: string) =>
  new SlashCommandBuilder()
    .setName(commandName)
    .setDescription("Play music")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(Subcommand.Add)
        .setDescription(description[Subcommand.Add])
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("The Youtube url or the keywords")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(Subcommand.Remove)
        .setDescription(description[Subcommand.Remove])
        .addNumberOption((option) =>
          option
            .setName("position")
            .setDescription("The place of the song in the queue")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("number")
            .setDescription("The number of songs to removed")
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
        .addNumberOption((option) =>
          option.setName("number").setDescription("The number of songs to skip")
        )
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

function getReplyFromList(
  audio: AudioInfo[],
  onExist: string,
  onEmpty: string
) {
  if (audio instanceof Array && audio.length > 0) {
    return updater.message({
      description: onExist,
      field: audio.map((info, index) => ({
        name: `${index + 1}. ${info.title}`,
        value: info.url,
      })),
    });
  }
  return updater.message({ description: onEmpty });
}

const executor: {
  [key in Subcommand]: (
    interaction: InteractionType
  ) => Promise<BaseMessageOptions>;
} = {
  [Subcommand.Add]: async (interaction) => {
    const url = interaction.options.getString("url", true);
    const newAudio = await player.add(url);
    return getReplyFromList(newAudio, "Add a song:", "Invalid link");
  },
  [Subcommand.Remove]: async (interaction) => {
    const position = interaction.options.getNumber("position", true);
    const number = interaction.options.getNumber("number");
    const removed = player.remove(position, number);
    return getReplyFromList(
      removed,
      "Remove the song:",
      "Failed to remove song from the queue"
    );
  },
  [Subcommand.Leave]: async (interaction) => {
    player.stop();
    return updater.message({ description: "Left the voice channel" });
  },
  [Subcommand.Skip]: async (interaction) => {
    const number = interaction.options.getNumber("number");
    const skipped = player[Subcommand.Skip](number);
    return getReplyFromList(
      skipped,
      "Skip the song",
      "There's no song playing"
    );
  },
  [Subcommand.Stop]: async (interaction) => {
    player[Subcommand.Stop]();
    return updater.message({ description: "Music stopped" });
  },
  [Subcommand.List]: async (interaction) => {
    return getReplyFromList(
      player.list,
      "List of songs in the queue:",
      "Empty queue"
    );
  },
  [Subcommand.ClearQueue]: async (interaction) => {
    const oldQueue = player[Subcommand.ClearQueue]();
    return getReplyFromList(
      oldQueue,
      "Clear the queue",
      "Queue is already empty"
    );
  },
  [Subcommand.Pause]: async (interaction) => {
    return updater.message({
      description: player[Subcommand.Pause]()
        ? "Paused the player"
        : "Failed to pause the player",
    });
  },
  [Subcommand.Unpause]: async (interaction) => {
    return updater.message({
      description: player[Subcommand.Unpause]()
        ? "Unpaused the player"
        : "Failed to unpause the player",
    });
  },
  [Subcommand.Loop]: async (interaction) => {
    const loop = player[Subcommand.Loop]();
    return getReplyFromList(loop, "Loop the song:", "Starts looping.");
  },
  [Subcommand.Unloop]: async (interaction) => {
    const unloop = player[Subcommand.Unloop]();
    return getReplyFromList(
      unloop,
      "Stops looping the song:",
      "Stops looping."
    );
  },
};

/**
 * The main executioner of this command.
 * @param interaction The interaction object.
 */
async function execute(interaction: InteractionType) {
  await interaction.deferReply();

  const client = interaction.client as CustomClient;
  const subcommand = interaction.options.getSubcommand() as Subcommand;
  let status = subcommand === Subcommand.Leave;

  if (!status) {
    updater.channel = interaction.channel as TextBasedChannel;

    const member = interaction.member as GuildMember;
    const userVoiceChannel = member.voice.channel as VoiceBasedChannel;
    status = client.connection.connect(userVoiceChannel);
    if (status) {
      client.connection.subcribe = player.player;
    }
  } else {
    client.connection.leave();
  }

  const message: BaseMessageOptions = status
    ? await executor[subcommand](interaction)
    : updater.message({
        description: "You need to join a voice channel to play the music",
      });
  await interaction.editReply(message);
}

export { commandName as name, data, execute };
