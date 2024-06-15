import { MusicSubcommand } from "./template";

class ListCommand extends MusicSubcommand {
  constructor() {
    super("list", "List the songs in the player queue");
  }

  async execute() {
    this.resultAudio = [...this.player.list];
    if (this.resultAudio.length > 0) {
      return "List of songs in the queue:";
    }
    return "Empty queue";
  }
}

class ClearQueueCommand extends MusicSubcommand {
  constructor() {
    super("clearqueue", "Clear the player queue");
  }

  async execute() {
    this.resultAudio = this.player.clearqueue();
    if (this.resultAudio.length > 0) {
      return "Clear the queue";
    }
    return "Queue is already empty";
  }
}

export { ListCommand, ClearQueueCommand };
