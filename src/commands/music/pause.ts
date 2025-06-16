import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";

class Executor extends MusicSubcommand {
  constructor() {
    super("pause", "Pause the player");
  }

  async execute() {
    return this.player.pause()
      ? "Paused the player"
      : "Failed to pause the player";
  }
}

const Exe = new Executor();
const Discord = new DiscordMusicController(Exe);
const Cli = new CliMusicController(Exe);

export { Discord, Cli };
