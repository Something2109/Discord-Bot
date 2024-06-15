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
import { OptionExtraction, Executor, SubcommandExecutor } from "./Executor";

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

interface APIDiscordExecuteFlow {
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
  extractOptions(interaction: InteractionType): Promise<OptionExtraction>;

  /**
   * Get the discord reply to the command result.
   * Take the options and the result string as the input.
   * @param options The options of the interaction.
   * @param result Description of the result.
   * @returns The reply string.
   */
  createReply(
    options: OptionExtraction,
    result: string
  ): Promise<BaseMessageOptions>;

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
abstract class BaseDiscordController
  implements DiscordController, APIDiscordExecuteFlow
{
  abstract readonly executor: Executor;

  get name() {
    return this.executor.name;
  }

  data(guildId: string): SlashCommandBuilder {
    const command = new SlashCommandBuilder()
      .setName(this.executor.name)
      .setDescription(this.executor.description);

    return command;
  }

  async execute(interaction: InteractionType) {
    await interaction.deferReply();

    let message = await this.preExecute(interaction);
    if (!message) {
      const options = await this.extractOptions(interaction);
      const result = await this.executor.execute(options);
      message = await this.createReply(options, result);
    }
    await interaction.editReply(message);

    await this.postExecute(interaction);
  }

  async preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    return undefined;
  }

  async extractOptions(
    interaction: InteractionType
  ): Promise<OptionExtraction> {
    const result: OptionExtraction = {};
    if (interaction.isChatInputCommand()) {
      this.extractChatInputOptions(result, interaction.options.data);
    }
    return result;
  }

  async createReply(
    options: OptionExtraction,
    result: string
  ): Promise<BaseMessageOptions> {
    return {
      content: result,
    };
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

abstract class DiscordCommandController extends BaseDiscordController {
  readonly executor: Executor;
  readonly options?: DiscordOptionData;

  constructor(executor: Executor, options?: DiscordOptionData) {
    super();
    this.executor = executor;
    this.options = options;
  }

  data(guildId: string): SlashCommandBuilder {
    const builder = super.data(guildId);
    if (this.options) {
      builder.options.push(...this.options(guildId));
    }

    return builder;
  }
}

abstract class DiscordSubcommandController<
  SubcommandController extends Executor
> extends BaseDiscordController {
  readonly executor: SubcommandExecutor<SubcommandController>;
  readonly options: DiscordSubcommandOption;

  constructor(
    executor: SubcommandExecutor<SubcommandController>,
    options?: DiscordSubcommandOption
  ) {
    super();
    this.executor = executor;
    this.options = options ?? {};
  }

  data(guildId: string): SlashCommandBuilder {
    const builders = super.data(guildId);
    Object.values(this.executor.subcommands).forEach((subcommand) => {
      const builder = new SlashCommandSubcommandBuilder()
        .setName(subcommand.name)
        .setDescription(subcommand.description);
      let commandOption = this.options[subcommand.name];
      if (commandOption) {
        builder.options.push(...commandOption(guildId));
      }

      builders.addSubcommand(builder);
    });
    return builders;
  }
}

export {
  InteractionType,
  DiscordController,
  BaseDiscordController,
  DiscordCommandController,
  DiscordSubcommandOption,
  DiscordSubcommandController,
};
