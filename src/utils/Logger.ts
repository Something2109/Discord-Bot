import { ConsoleLineInterface } from "./Console";

/**
 * Use to log the server logging text to the CLI and save to file.
 */
class Logger {
  private src: string;

  constructor(src: string) {
    this.src = src;
  }

  /**
   * Use to print directly to the console line
   * without saving it to the log file.
   * Used to print extra information from a command.
   * @param message The message to
   */
  public print(message: string) {
    ConsoleLineInterface.print(message);
  }

  /**
   * Print the message to the CLI and push to the save log.
   * Used to print important information like executing a command or
   * state change of an object.
   * @param message The message to save.
   */
  public log(message: string) {
    ConsoleLineInterface.log(message, this.src);
  }

  /**
   * Print the error to the CLI and push to save queue.
   * @param error The error to log.
   */
  public error(error: unknown) {
    ConsoleLineInterface.error(error, this.src);
  }
}

export { Logger };
