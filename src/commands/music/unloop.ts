import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";
import { AudioInfo } from "../../utils/music/Player";
import { BaseMessageOptions } from "discord.js";

function description(list: AudioInfo[]) {
  return list.length > 1 ? "Unloop the songs:" : "Unloop a song:";
}

class Executor extends MusicSubcommand {
  constructor() {
    super("unloop", "Continue to play the next song in the queue");
  }

  async execute() {
    const result = this.player.unloop();

    if (result.length > 0) return result;

    return "Stops looping.";
  }
}

class DiscordController extends DiscordMusicController {
  constructor(executor: Executor) {
    super(executor);
  }

  async createReply(result: string | AudioInfo[]): Promise<BaseMessageOptions> {
    if (typeof result === "string")
      return this.updater.message({ description: result });

    return this.updater.message({
      description: description(result),
      field: this.createAudio(result),
    });
  }
}

class CliController extends CliMusicController {
  constructor(executor: Executor) {
    super(executor);
  }

  async createReply(result: string | AudioInfo[]) {
    if (typeof result === "string") return result;

    return [description(result), ...this.createAudio(result)].join("\n");
  }
}

const Exe = new Executor();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
