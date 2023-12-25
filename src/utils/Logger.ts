import fs from "fs";
import path from "node:path";

/**
 * Use to log the server logging text to the CLI and save to file.
 */
class Logger {
  private static date: Date;
  private static logList: string[];
  private static timeout?: NodeJS.Timeout;

  private src: string;

  constructor(src: string) {
    if (!Logger.date) {
      Logger.date = new Date();
    }
    if (!Logger.logList) {
      Logger.logList = [];
    }

    this.src = src;
  }

  /**
   * Function called to save the list to file.
   */
  private static save() {
    if (Logger.timeout) {
      clearTimeout(Logger.timeout);
    }
    Logger.timeout = setTimeout(() => {
      Logger.saveToFile();
      Logger.logList.length = 0;
      Logger.timeout = undefined;
    }, 5000);
  }

  /**
   * Save the log to file.
   */
  private static saveToFile() {
    const logDir = path.join(".", "log");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    if (Logger.date.getDay() !== new Date().getDay()) {
      Logger.date = new Date();
    }

    const logPath = path.join(
      logDir,
      `${Logger.date.toLocaleDateString().replaceAll("/", "-")}.txt`
    );
    if (fs.existsSync(logPath)) {
      fs.appendFileSync(logPath, Logger.logList.join("\n"));
    } else {
      fs.writeFileSync(logPath, Logger.logList.join("\n"));
    }
  }

  /**
   * Print the message to the CLI and push to the save queue.
   * @param message The message to save.
   */
  public log(message: string) {
    const time = new Date().toLocaleString();
    const log = `[${time}][${this.src}]: ${message}.`;

    console.log(log);
    Logger.logList.push(log);

    Logger.save();
  }

  /**
   * Log the error to the CLI and push to save queue.
   * @param error The error to log.
   */
  public error(error: unknown) {
    const logError = error as Error;
    const time = new Date().toLocaleString();
    const log = `[${time}][${this.src}][ERROR]: ${logError.message}.`;

    console.error(log);
    Logger.logList.push(log);

    Logger.save();
  }
}

export { Logger };
