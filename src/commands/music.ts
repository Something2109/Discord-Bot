import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Updater, DefaultUpdater } from "../utils/Updater";
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

  async execute(options: OptionExtraction) {
    this.resultAudio = await this.player.add(options["url"] as string);
    if (this.resultAudio.length === 1) {
      return "Add a song:";
    } else if (this.resultAudio.length > 1) {
      return "Add a list of song:";
    }
    return "Invalid link";
  }
}

class RemoveCommand extends MusicSubcommand {
  constructor() {
    super(Subcommand.Remove, "Remove the specified song from the queue");
  }

  async execute(options: OptionExtraction) {
    const position = options["position"] as number;
    const number = options["number"] as number;
    this.resultAudio = this.player.remove(position, number);
    if (this.resultAudio) {
      return "Remove the song:";
    }
    return "Failed to remove song from the queue";
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

  async execute(options: OptionExtraction) {
    const number = options["number"] as number;
    this.resultAudio = this.player.skip(number);
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
    this.resultAudio = this.player.list;
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

const subcommands: DiscordSubcommandOption<Subcommand> = {
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

class MusicController extends SubcommandExecutor<Subcommand, MusicSubcommand> {
  readonly subcommands = {
    add: new AddCommand(),
    remove: new RemoveCommand(),
    leave: new LeaveCommand(),
    skip: new SkipCommand(),
    stop: new StopCommand(),
    list: new ListCommand(),
    clearqueue: new ClearQueueCommand(),
    pause: new PauseCommand(),
    unpause: new UnpauseCommand(),
    loop: new LoopCommand(),
    unloop: new UnloopCommand(),
  };

  constructor(player: Player) {
    super("music", "Play music");
    MusicSubcommand.player =
      player ?? new DefaultPlayer(new DefaultUpdater("Music Player"));
    MusicSubcommand.resultAudio = [];
  }
}

class DiscordMusicController extends DiscordSubcommandController<
  Subcommand,
  MusicSubcommand
> {
  readonly options;
  readonly updater: Updater;
  readonly executor: MusicController;

  constructor() {
    super();
    this.options = subcommands;
    this.updater = new DefaultUpdater("Music Player");
    const player = new DefaultPlayer(this.updater);
    this.executor = new MusicController(player);
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
    const audioList = MusicSubcommand.resultAudio.map((info, index) => ({
      name: `${index + 1}. ${info.title}`,
      value: info.url,
    }));
    MusicSubcommand.resultAudio.length = 0;
    return this.updater.message({
      description,
      field: audioList,
    });
  }
}

const discord = new DiscordMusicController();

export { discord };
