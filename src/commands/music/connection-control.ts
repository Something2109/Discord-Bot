import { MusicSubcommand } from "./template";

class JoinCommand extends MusicSubcommand {
  constructor() {
    super("join", "Force the player to join channel");
  }

  async execute() {
    return "Join the voice channel";
  }
}

class LeaveCommand extends MusicSubcommand {
  constructor() {
    super("leave", "Force the player to leave channel");
  }

  async execute() {
    this.player.stop();
    this.player.unloop();
    return "Left the voice channel";
  }
}

export { JoinCommand, LeaveCommand };
