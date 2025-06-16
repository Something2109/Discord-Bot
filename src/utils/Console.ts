import { Collection } from "discord.js";
import readline from "readline";
import fs from "fs";
import path from "node:path";
import { CliController } from "./controller/Console";

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
  public static log(message: string, src = "CLI", force = false) {
    ConsoleLineInterface.pause();

    const time = new Date().toLocaleString();
    const log = `[${time}][${src}]: ${message}`;

    console.log(log);
    Log.push(log, force);
  }

  /**
   * Print the error to the CLI and push to save queue.
   * @param error The error to log.
   * @param src The source of the error.
   * @param force The indicator to force save the message.
   */
  public static error(error: unknown, src = "CLI", force = true) {
    ConsoleLineInterface.pause();

    const logError = error as Error;
    const time = new Date().toLocaleString();
    const log = `[${time}][${src}][ERROR]: ${
      logError.stack ? logError.stack : logError.message
    }.`;

    console.log(log);
    Log.push(log, force);
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
  static addCommandListener(commands: Collection<string, CliController>) {
    ConsoleLineInterface.terminal.removeAllListeners("line");

    /**
     * The function called when the readline interface has a new input line inserted.
     * The function search the command based on the splitted input string and execute it.
     * @param input The input string from the readline interface.
     */
    function onNewLine(input: string) {
      if (input.length > 0) {
        ConsoleLineInterface.terminal.pause();

        const [commandName, ...option] = input.split(" ");
        const executor = commandName ? commands.get(commandName) : null;

        if (executor) {
          ConsoleLineInterface.log(
            `Executing ${commandName} sent from the console line interface.`
          );
          executor.execute(option).then((result: string) => {
            ConsoleLineInterface.log(result, "CLI", commandName == "exit");
          });
        } else {
          ConsoleLineInterface.log(
            `Cannot find command name from key ${commandName}`
          );
        }
      }
    }

    ConsoleLineInterface.terminal.on("line", onNewLine);
  }
}

/**
 * The class responsible for saving the important information
 * of the bot to the log files.
 */
class Log {
  private static date = new Date();
  private static logList: string[] = [];
  private static timeout?: NodeJS.Timeout;

  /**
   * Push the line into the save list.
   * @param line The line to save.
   */
  static push(line: string, force = false) {
    Log.logList.push(line);
    force ? Log.forceSave() : Log.save();
  }

  /**
   * Function called to save the list to file.
   * Create a timeout to wait for more new lines to be bunk saved.
   * If no more new line coming, the new lines will be saved by using force save function.
   */
  private static save() {
    if (Log.timeout) {
      clearTimeout(Log.timeout);
    }
    Log.timeout = setTimeout(() => {
      Log.forceSave();
      Log.logList.length = 0;
      Log.timeout = undefined;
    }, 5000);
  }

  /**
   * Save the log to file immediately.
   */
  private static forceSave() {
    const logDir = path.join(".", "log");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    if (Log.date.getDay() !== new Date().getDay()) {
      Log.date = new Date();
    }

    const logPath = path.join(
      logDir,
      `${Log.date.toLocaleDateString().replaceAll("/", "-")}.txt`
    );
    fs.appendFileSync(logPath, Log.logList.join("\n"));
  }
}

export { ConsoleLineInterface };
