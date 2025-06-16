import {
  CliMusicController,
  DiscordMusicController,
  MusicSubcommand,
} from "./template";

class Executor extends MusicSubcommand {
  constructor() {
    super("join", "Force the player to join channel");
  }

  async execute() {
    return "Join the voice channel";
  }
}

const Exe = new Executor();
const Discord = new DiscordMusicController(Exe);
const Cli = new CliMusicController(Exe);

export { Discord, Cli };
