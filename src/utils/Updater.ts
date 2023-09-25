import { APIEmbedField, TextBasedChannel } from "discord.js";
import { createMessage } from "./utils";

export class Updater {
  private textChannel: TextBasedChannel | undefined;

  set channel(channel: TextBasedChannel) {
    this.textChannel = channel;
  }

  send(
    message: string,
    url?: string,
    description?: string,
    field?: Array<APIEmbedField>
  ) {
    this.textChannel?.send(createMessage(message, url, description, field));
  }
}

class ServerUpdater extends Updater {
  update(message: string) {
    if (message.includes("joined")) {
      this.send("Joined the game");
    }
  }
}
