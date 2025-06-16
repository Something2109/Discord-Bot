import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";
import { AudioInfo } from "../../utils/music/Player";
import { BaseMessageOptions } from "discord.js";

function description(list: AudioInfo[]) {
  return list.length > 0 ? "List of songs in the queue:" : "Empty queue";
}

class Executor extends MusicSubcommand {
  constructor() {
    super("list", "List the songs in the player queue");
  }

  async execute() {
    return this.player.list;
  }
}

class DiscordController extends DiscordMusicController {
  constructor(executor: Executor) {
    super(executor);
  }

  async createReply(result: string | AudioInfo[]): Promise<BaseMessageOptions> {
    if (typeof result === "string")
      return DiscordController.updater.message({ description: result });

    return DiscordController.updater.message({
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
