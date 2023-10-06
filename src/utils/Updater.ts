import {
  APIEmbedField,
  BaseMessageOptions,
  Message,
  TextBasedChannel,
} from "discord.js";

interface MessageAPI {
  description: string;
  url?: string;
  field?: Array<APIEmbedField>;
  actionRow?: any;
}

class Updater {
  private readonly title: string;
  private textChannel: TextBasedChannel | undefined;

  constructor(title: string) {
    this.title = title;
  }

  set channel(channel: TextBasedChannel) {
    this.textChannel = channel;
  }

  /**
   * Create the message to send to the discord channel.
   * @param message The message string to send.
   * @param url The optional url of the message.
   * @param showQueue The indicator to show the music queue in the message.
   * @returns The message object to send.
   */
  public message(message: MessageAPI): BaseMessageOptions {
    const embed = {
      color: 0x0099ff,
      title: this.title,
      url: message.url,
      description: message.description,
      fields: message.field,
    };
    return {
      embeds: [embed],
      components: message.actionRow ? [message.actionRow] : [],
    };
  }

  async send(message: MessageAPI): Promise<Message | undefined> {
    return this.textChannel?.send(this.message(message));
  }
}

export { Updater, MessageAPI };
