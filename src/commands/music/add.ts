import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";
import { InteractionType } from "../../utils/controller/Discord";
import { AudioInfo } from "../../utils/music/Player";
import {
  SlashCommandStringOption,
  BaseMessageOptions,
  ChatInputCommandInteraction,
} from "discord.js";

type AddOptions = { url: string };

function description(list: AudioInfo[]) {
  return list.length > 1 ? "Add a list of song:" : "Add a song:";
}

class Executor extends MusicSubcommand<AddOptions> {
  constructor() {
    super("add", "Add a song to the player queue");
  }

  async execute({ url }: AddOptions) {
    const result = await this.player.add(url.toString());

    if (result.length === 0) return "Invalid link";

    return result;
  }
}

class DiscordController extends DiscordMusicController<AddOptions> {
  constructor(executor: Executor) {
    super(executor);
  }

  options = (guildId: string) => [
    new SlashCommandStringOption()
      .setName("url")
      .setDescription("The Youtube url or the keywords")
      .setRequired(true),
  ];

  async extractOptions(interaction: InteractionType): Promise<AddOptions> {
    if (interaction instanceof ChatInputCommandInteraction) {
      return { url: interaction.options.getString("url", true) };
    }
    return { url: "" };
  }

  async createReply(
    result: string | AudioInfo[],
    _: { url: string }
  ): Promise<BaseMessageOptions> {
    if (typeof result === "string")
      return DiscordController.updater.message({ description: result });

    return DiscordController.updater.message({
      description: description(result),
      field: this.createAudio(result),
    });
  }
}

class CliController extends CliMusicController<AddOptions> {
  options = [
    {
      name: "url",
      description: "The Youtube url or the keywords",
    },
  ];

  constructor(executor: Executor) {
    super(executor);
  }

  async extractOptions([input]: string[]): Promise<AddOptions> {
    if (!input) return { url: "" };

    return { url: input };
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
