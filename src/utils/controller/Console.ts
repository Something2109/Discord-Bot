import { Executor, OptionExtraction } from "./Executor";

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

interface APIConsoleExecuteFlow<
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
  preExecute(): Promise<string | undefined>;

  /**
   * Extract the subcommand and related options from the interaction.
   * @param interaction The interaction to extract.
   * @returns An object contains all the extracted options
   */
  extractOptions(input: string[]): Promise<Options>;

  /**
   * Get the discord reply to the command result.
   * Take the options and the result string as the input.
   * @param options The options of the interaction.
   * @param result Description of the result.
   * @returns The reply string.
   */
  createReply(result: Result, options: Options): Promise<string>;

  /**
   * The function run after the message has been sent.
   * Can be used for modifying the message with new info or
   * destroying the unnessary data.
   * @param interaction The interaction created the execution line.
   */
  // postExecute(input: string[]): Promise<void>;
}

abstract class CliCommandController<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> implements CliController, APIConsoleExecuteFlow<Options, Result>
{
  readonly executor: Executor<Options, Result>;
  readonly options?: CliOptionData[];

  constructor(executor: Executor<Options, Result>, options?: CliOptionData[]) {
    this.executor = executor;
  }

  get name() {
    return this.executor.name;
  }

  help(): string {
    const command = `${this.executor.name}: ${this.executor.description}`;
    let options: string[] = [];

    if (this.options) {
      options = this.options.map(
        ({ name, description }) => `\t<${name}>: ${description}`
      );
    }
    return [command, ...options].join("\n");
  }

  async execute(input: string[]) {
    let message: string | undefined = await this.preExecute();
    if (!message) {
      const options = await this.extractOptions(input);
      const result = await this.executor.execute(options);
      message = await this.createReply(result, options);
    }
    return message;
  }

  async preExecute(): Promise<string | undefined> {
    return undefined;
  }

  async extractOptions(_: string[]) {
    return {} as Options;
  }

  async createReply(result: Result, _: Options) {
    return result as string;
  }
}

class CliSubcommandController implements CliController {
  readonly name: string;
  readonly description: string;
  private readonly executors: { [key in string]: CliController };

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.executors = {};
  }

  add(...controllers: CliController[]) {
    controllers.forEach((controller) => {
      this.executors[controller.name] = controller;
    });
  }

  help(): string {
    const command = `${this.name}: ${this.description}`;
    const subcommands = Object.values(this.executors).map(
      (subcommand) => `\t${subcommand.help().replaceAll(/\n\t/g, "\n\t\t")}`
    );
    return [command, ...subcommands].join("\n");
  }

  async execute(input: string[]): Promise<string> {
    const subcommand = input.shift();

    if (!subcommand || !this.executors[subcommand]) {
      return "No subcommand matched";
    }

    return this.executors[subcommand].execute(input);
  }
}

export { CliController, CliCommandController, CliSubcommandController };
