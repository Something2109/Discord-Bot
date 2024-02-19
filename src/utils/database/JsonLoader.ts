import fs from "fs";
import path from "node:path";
import { Logger } from "../Logger";

/**
 * The base class of data storing.
 * Contains the base data storing properties and the save and load json functions.
 */
abstract class JsonLoader<T> {
  protected readonly path: string;
  protected list: T[];

  protected static logger: Logger;
  private saveCooldown?: NodeJS.Timeout;

  constructor(filePath: string) {
    if (!JsonLoader.logger) {
      JsonLoader.logger = new Logger("LDR");
    }
    this.list = [];
    this.path = filePath;
    this.load();
  }

  /**
   * Check if the list contains data or not.
   * @returns true if empty else false.
   */
  public isEmpty(): boolean {
    return this.list.length === 0;
  }

  /**
   * Save the data to Json file.
   */
  protected save() {
    if (this.saveCooldown) {
      clearTimeout(this.saveCooldown);
    }
    this.saveCooldown = setTimeout(() => {
      if (!fs.existsSync(this.path)) {
        fs.mkdirSync(this.path);
      }
      fs.writeFileSync(this.path, JSON.stringify(this.list));
      JsonLoader.logger.log(
        `Save ${path.basename(this.path)} to ${path.dirname(this.path)}`
      );

      this.saveCooldown = undefined;
    }, 10000);
  }

  /**
   * Load the data from Json file.
   */
  protected load() {
    if (fs.existsSync(this.path)) {
      const data = fs.readFileSync(this.path).toString();
      this.list = JSON.parse(data);
      JsonLoader.logger.log(
        `Read ${path.basename(this.path)} from ${path.dirname(this.path)}`
      );
    }
  }
}

export { JsonLoader };
