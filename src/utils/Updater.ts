import {
  APIEmbedField,
  BaseMessageOptions,
  Message,
  TextBasedChannel,
} from "discord.js";

interface MessageAPI {
  title?: string;
  description: string;
  url?: string;
  field?: Array<APIEmbedField>;
  actionRow?: any;
}

/**
 * The Updater interface.
 * Contains the function declaring message
 * type and sending update to the channel set in it.
 * Implement this to use in other default classes.
 */
interface Updater {
  set channel(channel: TextBasedChannel);

  /**
   * Create the message to send to the discord channel.
   * @param message The message to send.
   * @param url The optional url of the message.
   * @param showQueue The indicator to show the music queue in the message.
   * @returns The message object to send.
   */
  message(message: MessageAPI): BaseMessageOptions;

  /**
   * Send the message to the specified channel.
   * @param message The message to send.
   * @returns The message in Discord format.
   */
  send(message: MessageAPI): Promise<Message | undefined>;
}

/**
 * The default class used in other function.
 */
class DefaultUpdater implements Updater {
  private readonly title: string;
  private textChannel: TextBasedChannel | undefined;

  constructor(title: string) {
    this.title = title;
  }

  set channel(channel: TextBasedChannel) {
    this.textChannel = channel;
  }

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
    try {
      return this.textChannel?.send(this.message(message));
    } catch (error) {
      console.log(error);
    }
  }
}

export { Updater, DefaultUpdater, MessageAPI };
