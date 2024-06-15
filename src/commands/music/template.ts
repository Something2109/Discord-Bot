import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Updater } from "../../utils/Updater";
import { AudioInfo, DefaultPlayer, Player } from "../../utils/music/Player";
import {
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../../utils/controller/Executor";
import {
  InteractionType,
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../../utils/controller/Discord";
import { CustomClient } from "../../utils/Client";
import { CliSubcommandController } from "../../utils/controller/Console";

enum Subcommand {
  Add = "add",
  Remove = "remove",
  Join = "join",
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

abstract class MusicSubcommand extends CommandExecutor {
  static player: Player;
  static resultAudio: AudioInfo[];

  get player() {
    return MusicSubcommand.player;
  }

  get resultAudio() {
    return MusicSubcommand.resultAudio;
  }

  set resultAudio(audios: AudioInfo[]) {
    MusicSubcommand.resultAudio = audios;
  }
}

const discordOptions: DiscordSubcommandOption = {
  [Subcommand.Add]: () => [
    new SlashCommandStringOption()
      .setName("url")
      .setDescription("The Youtube url or the keywords")
      .setRequired(true),
  ],

  [Subcommand.Remove]: () => [
    new SlashCommandNumberOption()
      .setName("position")
      .setDescription("The position of the first song in the queue")
      .setRequired(true),
    new SlashCommandNumberOption()
      .setName("number")
      .setDescription("The number of the song to remove"),
  ],
  [Subcommand.Skip]: () => [
    new SlashCommandNumberOption()
      .setName("number")
      .setDescription("The number of the song to skip"),
  ],
};

class MusicController extends SubcommandExecutor<MusicSubcommand> {
  constructor(player?: Player) {
    super("music", "Play music");
    if (!MusicSubcommand.player) {
      MusicSubcommand.player = player ?? new DefaultPlayer();
      MusicSubcommand.resultAudio = [];
    }
  }
}

class DiscordMusicController extends DiscordSubcommandController<MusicSubcommand> {
  readonly updater: Updater = new Updater("Music Player");

  constructor(executor: MusicController) {
    super(executor, discordOptions);
    MusicSubcommand.player.updater = this.updater;
  }

  async preExecute(interaction: InteractionType) {
    if (interaction instanceof ChatInputCommandInteraction) {
      const client = interaction.client as CustomClient;
      let status = interaction.options.getSubcommand() !== Subcommand.Leave;

      if (status) {
        this.updater.channel = interaction.channel as TextBasedChannel;

        const member = interaction.member as GuildMember;
        const userVoiceChannel = member.voice.channel as VoiceBasedChannel;
        status = client.connection.connect(userVoiceChannel);
        if (!status) {
          return this.updater.message({
            description: "You need to join a voice channel to play the music",
          });
        }
        client.connection.subcribe = MusicSubcommand.player.player;
      } else {
        client.connection.leave();
      }
      return undefined;
    }
  }

  async createReply(options: OptionExtraction, description: string) {
    const audioList = MusicSubcommand.resultAudio.map((info, index) =>
      Updater.field(`${index + 1}. ${info.title}`, info.url)
    );
    MusicSubcommand.resultAudio.length = 0;
    return this.updater.message({
      description,
      field: audioList,
    });
  }
}

const cliOptions = {
  [Subcommand.Add]: [
    {
      name: "url",
      description: "The Youtube url or the keywords",
    },
  ],
  [Subcommand.Remove]: [
    {
      name: "position",
      description: "The position of the first song in the queue",
    },
    {
      name: "number",
      description: "The number of the song to remove",
    },
  ],
  [Subcommand.Skip]: [
    {
      name: "number",
      description: "The number of the song to skip",
    },
  ],
};

class CliMusicController extends CliSubcommandController<MusicSubcommand> {
  constructor(executor: MusicController) {
    super(executor, cliOptions);
  }

  async createReply(options: OptionExtraction, description: string) {
    const audioList = MusicSubcommand.resultAudio.map(
      (info, index) => `\n\t${index + 1}. ${info.title}`
    );
    MusicSubcommand.resultAudio.length = 0;
    return description.concat(...audioList);
  }
}

export {
  MusicSubcommand,
  MusicController,
  DiscordMusicController,
  CliMusicController,
};
