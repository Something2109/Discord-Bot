import { MusicSubcommand } from "./template";
import { OptionExtraction } from "../../utils/controller/Executor";

class AddCommand extends MusicSubcommand {
  constructor() {
    super("add", "Add a song to the player queue");
  }

  async execute({ url }: OptionExtraction) {
    if (url) {
      this.resultAudio = await this.player.add(url.toString());
      if (this.resultAudio.length === 1) {
        return "Add a song:";
      } else if (this.resultAudio.length > 1) {
        return "Add a list of song:";
      }
    }
    return "Invalid link";
  }
}

class RemoveCommand extends MusicSubcommand {
  constructor() {
    super("remove", "Remove the specified song from the queue");
  }

  async execute({ position, number }: OptionExtraction) {
    if (position) {
      this.resultAudio = this.player.remove(Number(position), Number(number));
      if (this.resultAudio) {
        return "Remove the song:";
      }
    }
    return "Failed to remove song from the queue";
  }
}

class SkipCommand extends MusicSubcommand {
  constructor() {
    super("skip", "Skip to the next songs in the queue");
  }

  async execute({ number }: OptionExtraction) {
    this.resultAudio = this.player.skip(Number(number));
    if (this.resultAudio.length > 0) {
      return "Skip the song:";
    }
    return "There's no song playing";
  }
}

export { AddCommand, RemoveCommand, SkipCommand };
