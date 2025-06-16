import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";
import { BaseMessageOptions } from "discord.js";
import { InteractionType } from "../../utils/controller/Discord";
import { CustomClient } from "../../utils/Client";

class Executor extends MusicSubcommand {
  constructor() {
    super("leave", "Force the player to leave channel");
  }

  async execute() {
    this.player.stop();
    this.player.unloop();
    return "Left the voice channel";
  }
}

class DiscordController extends DiscordMusicController {
  async preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as CustomClient;

      client.connection.leave();
    }

    return undefined;
  }
}

const Exe = new Executor();
const Discord = new DiscordController(Exe);
const Cli = new CliMusicController(Exe);

export { Discord, Cli };
