import { Executor, OptionExtraction, SubcommandExecutor } from "./Executor";

/**
 * The interface for the custom client to identify the command the bot can use.
 * The custom command must follow or implement this interface to be integrated in the bot.
 */
interface CliController {
  /**
   * The name of the command to identify it from other command.
   */
  name: string;

  /**
   * Retrieve the command information for the guild.
   * @returns The command info in the form of string to display.
   */
  help: () => string;

  /**
   * Execute the command based on the interaction.
   * Called when there's an event triggered.
   * @param interaction The interaction to execute.
   */
  execute: (input: string[]) => Promise<string>;
}

type CliOptionData = {
  name: string;
  description: string;
};

type CliSubcommandOption = {
  [key in string]?: CliOptionData[];
};

interface APIDiscordExecuteFlow {
  /**
   * The function run before the executor function.
   * Can be used to set up the required conditions to run the main function.
   * The main controller will run if this function return undefined,
   * else will return the message created by this function.
   * @param interaction The interaction created the execution line.
   * @returns The message if conditions don't meet, else undefined.
   */
  preExecute(): Promise<string | undefined>;

  /**
   * Extract the subcommand and related options from the interaction.
   * @param interaction The interaction to extract.
   * @returns An object contains all the extracted options
   */
  extractOptions(input: string[]): Promise<OptionExtraction>;

  /**
   * Get the discord reply to the command result.
   * Take the options and the result string as the input.
   * @param options The options of the interaction.
   * @param result Description of the result.
   * @returns The reply string.
   */
  createReply(options: OptionExtraction, result: string): Promise<string>;

  /**
   * The function run after the message has been sent.
   * Can be used for modifying the message with new info or
   * destroying the unnessary data.
   * @param interaction The interaction created the execution line.
   */
  // postExecute(input: string[]): Promise<void>;
}

abstract class BaseCliController
  implements CliController, APIDiscordExecuteFlow
{
  abstract readonly executor: Executor;

  get name() {
    return this.executor.name;
  }

  help(): string {
    const command = `${this.executor.name}: ${this.executor.description}`;
    return command;
  }

  async execute(input: string[]) {
    let message: string | undefined = await this.preExecute();
    if (!message) {
      const options = await this.extractOptions(input);
      const result = await this.executor.execute(options);
      message = await this.createReply(options, result);
    }
    return message;
  }

  async preExecute(): Promise<string | undefined> {
    return undefined;
  }

  async extractOptions(input: string[]) {
    return {};
  }

  async createReply(options: OptionExtraction, result: string) {
    return result;
  }
}

abstract class CliCommandController extends BaseCliController {
  readonly executor: Executor;
  readonly options: CliOptionData[];

  constructor(executor: Executor, options?: CliOptionData[]) {
    super();
    this.executor = executor;
    this.options = options ?? [];
  }

  help(): string {
    const command = super.help();
    if (this.options) {
      this.options.forEach(
        ({ name, description }) => `\t<${name}>: ${description}`
      );
    }
    return command;
  }
}

abstract class CliSubcommandController<
  SubcommandController extends Executor
> extends BaseCliController {
  readonly executor: SubcommandExecutor<SubcommandController>;
  readonly options: CliSubcommandOption;

  constructor(
    executor: SubcommandExecutor<SubcommandController>,
    options?: CliSubcommandOption
  ) {
    super();
    this.executor = executor;
    this.options = options ?? {};
  }

  help(): string {
    const command = `${this.executor.name}: ${this.executor.description}`;
    const subcommands = Object.values(this.executor.subcommands).map(
      (data) => `\n\t${data.name}: ${data.description}`
    );
    return command.concat(...subcommands);
  }

  async extractOptions([subcommand, ...input]: string[]) {
    const options: OptionExtraction = {
      subcommand,
    };
    const optionList = this.options[subcommand];
    if (optionList) {
      for (let i = 0; i < Math.min(optionList.length, input.length); i++) {
        options[optionList[i].name] = input[i];
      }
    }

    return options;
  }
}

export {
  CliController,
  BaseCliController,
  CliCommandController,
  CliSubcommandController,
};
