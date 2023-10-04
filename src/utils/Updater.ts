import { APIEmbedField, Message, TextBasedChannel } from "discord.js";
import { MessageAPI, createMessage } from "./utils";

export class Updater {
  private textChannel: TextBasedChannel | undefined;

  set channel(channel: TextBasedChannel) {
    this.textChannel = channel;
  }

  async send(message: MessageAPI): Promise<Message | undefined> {
    return this.textChannel?.send(createMessage(message));
  }
}

export class ServerUpdater extends Updater {
  update(message: string, list?: Array<APIEmbedField>) {
    if (message.includes("joined") || message.includes("left")) {
      this.send({ title: message, field: list });
    }
  }
}
