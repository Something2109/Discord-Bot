import { MusicSubcommand } from "./template";

class LoopCommand extends MusicSubcommand {
  constructor() {
    super("loop", "Loop the playing song");
  }

  async execute() {
    this.resultAudio = this.player.loop();
    if (this.resultAudio) {
      return "Loop the song:";
    }
    return "Starts looping.";
  }
}

class UnloopCommand extends MusicSubcommand {
  constructor() {
    super("unloop", "Continue to play the next song in the queue");
  }

  async execute() {
    if (this.player.unpause()) {
      return "Unpaused the player";
    }
    return "Failed to unpause the player";
  }
}

export { LoopCommand, UnloopCommand };
