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

type RemoveOptions = { position: number; number: number | null };

function description(list: AudioInfo[]) {
  return list.length > 1 ? "Remove songs:" : "Remove a song:";
}

class Executor extends MusicSubcommand<RemoveOptions> {
  constructor() {
    super("remove", "Remove the specified song from the queue");
  }

  async execute({ position, number }: RemoveOptions) {
    const result = await this.player.remove(position, number);

    if (result.length === 0) return "Failed to remove song from the queue";

    return result;
  }
}

class DiscordController extends DiscordMusicController<RemoveOptions> {
  constructor(executor: Executor) {
    super(executor);
  }

  options = () => [
    new SlashCommandNumberOption()
      .setName("position")
      .setDescription("The position of the first song in the queue")
      .setRequired(true),
    new SlashCommandNumberOption()
      .setName("number")
      .setDescription("The number of the song to remove"),
  ];

  async extractOptions(interaction: InteractionType): Promise<RemoveOptions> {
    if (interaction instanceof ChatInputCommandInteraction) {
      return {
        position: interaction.options.getNumber("position", true),
        number: interaction.options.getNumber("number"),
      };
    }
    return { position: 1, number: null };
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

class CliController extends CliMusicController<RemoveOptions> {
  options = [
    {
      name: "position",
      description: "The position of the first song in the queue",
    },
    {
      name: "number",
      description: "The number of the song to remove",
    },
  ];

  constructor(executor: Executor) {
    super(executor);
  }

  async extractOptions([position, number]: string[]): Promise<RemoveOptions> {
    return {
      position: position ? Number(position) : 1,
      number: number ? Number(number) : null,
    };
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
