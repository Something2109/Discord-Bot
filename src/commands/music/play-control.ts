import { MusicSubcommand } from "./template";

class PauseCommand extends MusicSubcommand {
  constructor() {
    super("pause", "Pause the player");
  }

  async execute() {
    if (this.player.pause()) {
      return "Paused the player";
    }
    return "Failed to pause the player";
  }
}

class UnpauseCommand extends MusicSubcommand {
  constructor() {
    super("unpause", "Unpause the player");
  }

  async execute() {
    if (this.player.unpause()) {
      return "Unpaused the player";
    }
    return "Failed to unpause the player";
  }
}

class StopCommand extends MusicSubcommand {
  constructor() {
    super("stop", "Stop the player");
  }

  async execute() {
    this.player.stop();
    return "Music stopped";
  }
}

export { StopCommand, UnpauseCommand };
