import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Updater } from "../utils/Updater";
import { AudioInfo, DefaultPlayer, Player } from "../utils/music/Player";
import {
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../utils/controller/Executor";
import {
  InteractionType,
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../utils/controller/Discord";
import { CustomClient } from "../utils/Client";
import { CliSubcommandController } from "../utils/controller/Console";

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

class AddCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Add, "Add a song to the player queue");
  }

  async execute({ url }: OptionExtraction) {
    if (url) {
      this.resultAudio = await this.player.add(url.toString());
      if (this.resultAudio.length === 1) {
        return "Add a song:";
      } else if (this.resultAudio.length > 1) {
        return "Add a list of song:";
      }
    }
    return "Invalid link";
  }
}

class RemoveCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Remove, "Remove the specified song from the queue");
  }

  async execute({ position, number }: OptionExtraction) {
    if (position) {
      this.resultAudio = this.player.remove(Number(position), Number(number));
      if (this.resultAudio) {
        return "Remove the song:";
      }
    }
    return "Failed to remove song from the queue";
  }
}

class JoinCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Join, "Force the player to join channel");
  }

  async execute() {
    return "Join the voice channel";
  }
}

class LeaveCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Leave, "Force the player to leave channel");
  }

  async execute() {
    this.player.stop();
    return "Left the voice channel";
  }
}

class SkipCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Skip, "Skip to the next songs in the queue");
  }

  async execute({ number }: OptionExtraction) {
    this.resultAudio = this.player.skip(Number(number));
    if (this.resultAudio.length > 0) {
      return "Skip the song:";
    }
    return "There's no song playing";
  }
}

class StopCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Stop, "Stop the player");
  }

  async execute() {
    this.player.stop();
    return "Music stopped";
  }
}

class ListCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.List, "List the songs in the player queue");
  }

  async execute() {
    this.resultAudio = [...this.player.list];
    if (this.resultAudio.length > 0) {
      return "List of songs in the queue:";
    }
    return "Empty queue";
  }
}

class ClearQueueCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.ClearQueue, "Clear the player queue");
  }

  async execute() {
    this.resultAudio = this.player.clearqueue();
    if (this.resultAudio.length > 0) {
      return "Clear the queue";
    }
    return "Queue is already empty";
  }
}

class PauseCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Pause, "Pause the player");
  }

  async execute() {
    if (this.player.pause()) {
      return "Paused the player";
    }
    return "Failed to pause the player";
  }
}

class UnpauseCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Unpause, "Unpause the player");
  }

  async execute() {
    if (this.player.unpause()) {
      return "Unpaused the player";
    }
    return "Failed to unpause the player";
  }
}

class LoopCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Loop, "Loop the playing song");
  }

  async execute() {
    this.resultAudio = this.player.loop();
    if (this.resultAudio) {
      return "Loop the song:";
    }
    return "Starts looping.";
  }
}

class UnloopCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Unloop, "Continue to play the next song in the queue");
  }

  async execute() {
    if (this.player.unpause()) {
      return "Unpaused the player";
    }
    return "Failed to unpause the player";
  }
}

const discordSubcommand: DiscordSubcommandOption = {
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
    this.add(
      AddCommand,
      RemoveCommand,
      JoinCommand,
      LeaveCommand,
      SkipCommand,
      StopCommand,
      ListCommand,
      ClearQueueCommand,
      PauseCommand,
      UnpauseCommand,
      LoopCommand,
      UnloopCommand
    );
  }
}

class DiscordMusicController extends DiscordSubcommandController<MusicSubcommand> {
  readonly updater: Updater = new Updater("Music Player");

  constructor(executor: MusicController, options: DiscordSubcommandOption) {
    super(executor, options);
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
  async createReply(options: OptionExtraction, description: string) {
    const audioList = MusicSubcommand.resultAudio.map(
      (info, index) => `\n\t${index + 1}. ${info.title}`
    );
    MusicSubcommand.resultAudio.length = 0;
    return description.concat(...audioList);
  }
}

const executor = new MusicController();
const discord = new DiscordMusicController(executor, discordSubcommand);
const cli = new CliMusicController(executor, cliOptions);

export { discord, cli };
