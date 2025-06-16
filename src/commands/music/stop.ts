import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";

class Executor extends MusicSubcommand {
  constructor() {
    super("stop", "Stop the player");
  }

  async execute() {
    this.player.stop();
    return "Music stopped";
  }
}

const Exe = new Executor();
const Discord = new DiscordMusicController(Exe);
const Cli = new CliMusicController(Exe);

export { Discord, Cli };
