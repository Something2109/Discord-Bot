import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  BaseMessageOptions,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandOptionBase,
  CommandInteractionOption,
} from "discord.js";
import { OptionExtraction, Executor } from "./Executor";

type InteractionType = ChatInputCommandInteraction | ButtonInteraction;

type DiscordOptionData = (guildId: string) => ApplicationCommandOptionBase[];

type DiscordSubcommandOption = {
  [key in string]: DiscordOptionData;
};

/**
 * The interface for the custom client to identify the command the bot can use.
 * The custom command must follow or implement this interface to be integrated in the bot.
 */
interface DiscordController {
  /**
   * The name of the command to identify it from other command.
   */
  name: string;

  /**
   * Retrieve the command information for the guild.
   * @param guidId The guild id to get the command info.
   * @returns The command info in the form of discordjs builder.
   */
  data: (guidId: string) => SlashCommandBuilder;

  /**
   * Execute the command based on the interaction.
   * Called when there's an event triggered.
   * @param interaction The interaction to execute.
   */
  execute: (interaction: InteractionType) => Promise<void>;
}

interface APIDiscordExecuteFlow<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> {
  readonly executor: Executor<Options, Result>;

  /**
   * The function run before the executor function.
   * Can be used to set up the required conditions to run the main function.
   * The main controller will run if this function return undefined,
   * else will return the message created by this function.
   * @param interaction The interaction created the execution line.
   * @returns The message if conditions don't meet, else undefined.
   */
  preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined>;

  /**
   * Extract the subcommand and related options from the interaction.
   * @param interaction The interaction to extract.
   * @returns An object contains all the extracted options
   */
  extractOptions(interaction: InteractionType): Promise<Options>;

  /**
   * Get the discord reply to the command result.
   * Take the options and the result string as the input.
   * @param options The options of the interaction.
   * @param result Description of the result.
   * @returns The reply string.
   */
  createReply(result: Result, options: Options): Promise<BaseMessageOptions>;

  /**
   * The function run after the message has been sent.
   * Can be used for modifying the message with new info or
   * destroying the unnessary data.
   * @param interaction The interaction created the execution line.
   */
  postExecute(interaction: InteractionType): Promise<void>;
}

/**
 * A prototype discord controller for the bot.
 * Contains basic information and a simple pipeline for a command to run.
 */
abstract class DiscordCommandController<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> implements DiscordController, APIDiscordExecuteFlow<Options, Result>
{
  readonly executor: Executor<Options, Result>;
  readonly options?: (guildId: string) => ApplicationCommandOptionBase[];

  constructor(executor: Executor<Options, Result>) {
    this.executor = executor;
  }

  get name() {
    return this.executor.name;
  }

  data(guildId: string): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
      .setName(this.executor.name)
      .setDescription(this.executor.description);

    if (this.options) command.options.push(...this.options(guildId));

    return command;
  }

  async execute(interaction: InteractionType) {
    await interaction.deferReply();

    let message = await this.preExecute(interaction);
    if (!message) {
      const options = await this.extractOptions(interaction);
      const result = await this.executor.execute(options);
      message = await this.createReply(result, options);
    }
    await interaction.editReply(message);

    await this.postExecute(interaction);
  }

  async preExecute(
    _: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    return undefined;
  }

  async extractOptions(_: InteractionType): Promise<Options> {
    return undefined as Options;
  }

  async createReply(result: Result, _: Options): Promise<BaseMessageOptions> {
    if (typeof result === "object") return { content: JSON.stringify(result) };

    return { content: String(result) };
  }

  async postExecute(interaction: InteractionType): Promise<void> {
    return;
  }

  /**
   * Extract the chat input options into the result object
   * from the received interaction option object.
   * @param result The result object to be extracted into.
   * @param options The source interaction option object.
   */
  private extractChatInputOptions(
    result: OptionExtraction,
    options?: Readonly<CommandInteractionOption[]>
  ) {
    if (options) {
      options.forEach((option) => {
        switch (option.type) {
          case ApplicationCommandOptionType.Subcommand: {
            result.subcommand = option.name;
            this.extractChatInputOptions(result, option.options);
            break;
          }
          case ApplicationCommandOptionType.User: {
            result[option.name] = option.user?.id;
            break;
          }
          case ApplicationCommandOptionType.Channel: {
            result[option.name] = option.channel?.id;
            break;
          }
          case ApplicationCommandOptionType.Role: {
            result[option.name] = option.role?.id;
            break;
          }
          default:
            result[option.name] = option.value;
        }
      });
    }
  }
}

class DiscordSubcommandController implements DiscordController {
  readonly name: string;
  readonly description: string;
  private readonly executors: { [key in string]: DiscordController };

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.executors = {};
  }

  add(...controllers: DiscordController[]) {
    controllers.forEach((controller) => {
      this.executors[controller.name] = controller;
    });
  }

  data(guildId: string): SlashCommandBuilder {
    const builders = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);

    Object.values(this.executors).forEach((subcommand) => {
      const command = subcommand.data(guildId);
      const builder = new SlashCommandSubcommandBuilder()
        .setName(command.name)
        .setDescription(command.description);
      if (command.options.length > 0) {
        builder.options.push(
          ...(command.options as ApplicationCommandOptionBase[])
        );
      }

      builders.addSubcommand(builder);
    });
    return builders;
  }

  async execute(interaction: InteractionType) {
    if (interaction.isChatInputCommand()) {
      const name = interaction.options.getSubcommand();

      if (name && this.executors[name]) {
        await this.executors[name].execute(interaction);

        return;
      }
    }

    await interaction.reply({ content: "No subcommand matched" });
  }
}

export {
  InteractionType,
  DiscordController,
  DiscordCommandController,
  DiscordSubcommandOption,
  DiscordSubcommandController,
};
