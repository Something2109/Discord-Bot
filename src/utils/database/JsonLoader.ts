import fs from "fs";
import path from "node:path";
import { Logger } from "../Logger";

/**
 * The base class of data storing.
 * Contains the base data storing properties and the save and load json functions.
 */
abstract class JsonLoader {
  protected abstract list: any[];
  protected abstract path: string;
  protected abstract readonly SaveName: string;

  protected static logger: Logger;
  private saveCooldown?: NodeJS.Timeout;

  constructor() {
    if (!JsonLoader.logger) {
      JsonLoader.logger = new Logger("LDR");
    }
  }

  /**
   * Save the data to Json file.
   */
  save() {
    if (this.saveCooldown) {
      clearTimeout(this.saveCooldown);
    }
    this.saveCooldown = setTimeout(() => {
      if (!fs.existsSync(this.path)) {
        fs.mkdirSync(this.path);
      }
      fs.writeFileSync(
        path.join(this.path, this.SaveName),
        JSON.stringify(this.list)
      );
      JsonLoader.logger.log(`Save ${this.SaveName} to ${this.path}`);

      this.saveCooldown = undefined;
    }, 10000);
  }

  /**
   * Load the data from Json file.
   */
  load() {
    if (fs.existsSync(path.join(this.path, this.SaveName))) {
      const data = fs
        .readFileSync(path.join(this.path, this.SaveName))
        .toString();
      this.list = JSON.parse(data);
      JsonLoader.logger.log(`Read ${this.SaveName} from ${this.path}`);
    }
  }
}

export { JsonLoader };
