import {
  APIEmbedField,
  BaseMessageOptions,
  Message,
  TextBasedChannel,
} from "discord.js";

const MaxFieldNumber = 25;
interface MessageAPI {
  title?: string;
  description: string;
  url?: string;
  field?: Array<APIEmbedField>;
  actionRow?: any;
}

/**
 * The Updater class.
 * Contains the function declaring message
 * type and sending update to the channel set in it.
 */
class Updater {
  private readonly title: string;
  private textChannel: TextBasedChannel | undefined;

  constructor(title: string) {
    this.title = title;
  }

  /**
   * Set the channel to update the new message to.
   */
  set channel(channel: TextBasedChannel) {
    this.textChannel = channel;
  }

  /**
   * Create the message to send to the discord channel.
   * @param message The message to send.
   * @param url The optional url of the message.
   * @param showQueue The indicator to show the music queue in the message.
   * @returns The message object to send.
   */
  public message(message: MessageAPI): BaseMessageOptions {
    if (message.field && message.field.length > MaxFieldNumber) {
      const residual = message.field.length - (MaxFieldNumber - 1);
      message.field = message.field.slice(0, MaxFieldNumber);
      message.field[24] = {
        name: "And",
        value: `${residual} more...`,
      };
    }
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

  /**
   * Send the message to the specified channel.
   * @param message The message to send.
   * @returns The message in Discord format.
   */
  async send(message: MessageAPI): Promise<Message | undefined> {
    return this.textChannel?.send(this.message(message));
  }

  static field(name: string, value: string): APIEmbedField {
    return { name, value };
  }
}

export { Updater, MessageAPI };
