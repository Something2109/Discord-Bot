import { APIEmbed, APIEmbedField, BaseMessageOptions } from "discord.js";

interface MessageAPI {
  title: string;
  url?: string;
  description?: string;
  field?: Array<APIEmbedField>;
  actionRow?: any;
}

/**
 * Create the message to send to the discord channel.
 * @param message The message string to send.
 * @param url The optional url of the message.
 * @param showQueue The indicator to show the music queue in the message.
 * @returns The message object to send.
 */
function createMessage(message: MessageAPI): BaseMessageOptions {
  const embed: APIEmbed = {
    color: 0x0099ff,
    title: message.title,
    url: message.url,
    description: message.description,
    fields: message.field,
  };
  return {
    embeds: [embed],
    components: message.actionRow ? [message.actionRow] : [],
  };
}

export { MessageAPI, createMessage };
