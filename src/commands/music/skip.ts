import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";
import { InteractionType } from "../../utils/controller/Discord";
import { AudioInfo } from "../../utils/music/Player";
import {
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandNumberOption,
} from "discord.js";

type Options = { number: number | null };

function description(list: AudioInfo[]) {
  return list.length > 1 ? "Skip the songs:" : "Skip a song:";
}

class Executor extends MusicSubcommand<Options> {
  constructor() {
    super("skip", "Skip to the next songs in the queue");
  }

  async execute({ number }: Options) {
    const result = this.player.skip(Number(number));

    if (result.length > 0) return result;

    return "There's no song playing";
  }
}

class DiscordController extends DiscordMusicController<Options> {
  constructor(executor: Executor) {
    super(executor);
  }

  options = () => [
    new SlashCommandNumberOption()
      .setName("number")
      .setDescription("The number of the song to skip"),
  ];

  async extractOptions(interaction: InteractionType): Promise<Options> {
    if (interaction instanceof ChatInputCommandInteraction) {
      return {
        number: interaction.options.getNumber("number"),
      };
    }
    return { number: null };
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

class CliController extends CliMusicController<Options> {
  options = [
    {
      name: "number",
      description: "The number of the song to skip",
    },
  ];

  constructor(executor: Executor) {
    super(executor);
  }

  async extractOptions([number]: string[]): Promise<Options> {
    return { number: number ? Number(number) : null };
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
