import fs from "fs";
import path from "node:path";

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

  private static save() {
    if (Logger.timeout) {
      clearTimeout(Logger.timeout);
    }
    Logger.timeout = setTimeout(() => {
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

      Logger.timeout = undefined;
    }, 5000);
  }

  public log(message: unknown) {
    const time = new Date().toLocaleString();
    const log = `[${time}][${this.src}]: ${message}.`;

    console.log(log);
    Logger.logList.push(log);

    Logger.save();
  }

  public error(message: unknown) {
    const time = new Date().toLocaleString();
    const log = `[${time}][${this.src}][ERROR]: ${message}.`;

    console.error(log);
    Logger.logList.push(log);

    Logger.save();
  }
}

export { Logger };
