import readline from "readline";

class ConsoleLineInterface {
  private static terminal = ConsoleLineInterface.createInterface(
    process.stdin,
    process.stdout
  );
  private static timeout?: NodeJS.Timeout;

  /**
   * Use to print directly to the console line
   * without saving it to the log file.
   * Used to print extra information from a command.
   * @param message The message to
   */
  public static print(message: string) {
    ConsoleLineInterface.pause();

    console.log(message);
  }

  /**
   * Print the message to the CLI and push to the save log.
   * @param message The message to log.
   * @param src The source of the message.
   * @param force The indicator to force save the message.
   */
  public static log(message: string) {
    ConsoleLineInterface.pause();

    console.log(message);
  }

  /**
   * Print the error to the CLI and push to save queue.
   * @param error The error to log.
   * @param src The source of the error.
   * @param force The indicator to force save the message.
   */
  public static error(message: string) {
    ConsoleLineInterface.pause();

    console.log(message);
  }

  /**
   * Pause the input interface for a bit of time before it is enabled again.
   * Will refresh the pause time each time called.
   */
  public static pause() {
    if (!ConsoleLineInterface.timeout) {
      ConsoleLineInterface.terminal.pause();
    } else {
      clearTimeout(ConsoleLineInterface.timeout);
    }

    ConsoleLineInterface.timeout = setTimeout(() => {
      ConsoleLineInterface.terminal.prompt();
    }, 1000);
  }

  /**
   * Create a new readline interface with the specified input and output.
   * @param input Readable stream to be used as input for the interface to read.
   * @param output Writable stream to be used as output for the interface to write to.
   * @returns The new interface.
   */
  private static createInterface(
    input: NodeJS.ReadableStream,
    output: NodeJS.WritableStream
  ): readline.Interface {
    const newInterface = readline.createInterface({
      input,
      output,
    });
    newInterface.on("SIGINT", ConsoleLineInterface.exit);
    return newInterface;
  }

  /**
   * The function called when there's an exit signal from the console like
   * the exit command or the sigint signal from the interface.
   * @returns The string indicate the exit of the program.
   */
  static exit() {
    ConsoleLineInterface.terminal.close();
    process.exit();
  }

  /**
   * Add command listener to the cli interface.
   * @param commands The collection of commands to be listened.
   */
  static addCommandListener(executor: (input: string) => void) {
    ConsoleLineInterface.terminal.removeAllListeners("line");

    ConsoleLineInterface.terminal.on("line", executor);
  }
}

export default ConsoleLineInterface;
