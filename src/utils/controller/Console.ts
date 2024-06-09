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

interface APIDiscordExecuteFlow {
  /**
   * The function run before the executor function.
   * Can be used to set up the required conditions to run the main function.
   * The main controller will run if this function return undefined,
   * else will return the message created by this function.
   * @param interaction The interaction created the execution line.
   * @returns The message if conditions don't meet, else undefined.
   */
  preExecute(input: string[]): Promise<string | undefined>;

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

abstract class CliCommandController
  implements CliController, APIDiscordExecuteFlow
{
  abstract readonly executor: Executor;

  get name() {
    return this.executor.name;
  }

  help(): string {
    const result = "";
    return result;
  }

  async execute(input: string[]) {
    let message = await this.preExecute(input);
    if (!message) {
      const options = await this.extractOptions(input);
      const result = await this.executor.execute(options);
      message = await this.createReply(options, result);
    }
    return message;
  }

  async preExecute(input: string[]) {
    return "";
  }

  async extractOptions(input: string[]) {
    return {};
  }

  async createReply(options: OptionExtraction, result: string) {
    return "";
  }
}

export { CliController };
