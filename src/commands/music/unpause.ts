import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";

class Executor extends MusicSubcommand {
  constructor() {
    super("unpause", "Unpause the player");
  }

  async execute() {
    return this.player.unpause()
      ? "Unpaused the player"
      : "Failed to unpause the player";
  }
}

const Exe = new Executor();
const Discord = new DiscordMusicController(Exe);
const Cli = new CliMusicController(Exe);

export { Discord, Cli };
