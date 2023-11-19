import fs from "fs";
import path from "node:path";

abstract class JsonLoader {
  abstract list: any[];
  abstract path: string;

  /**
   * Save the data to Json file.
   */
  save() {
    if (!fs.existsSync(path.dirname(this.path))) {
      fs.mkdirSync(path.dirname(this.path));
    }
    fs.writeFile(this.path, JSON.stringify(this.list), function (err) {
      if (err) throw err;
    });
  }

  /**
   * Load the data from Json file.
   */
  load() {
    if (fs.existsSync(this.path)) {
      fs.readFile(this.path, (err, data) => {
        if (err) throw err;
        this.list = JSON.parse(data.toString());
      });
    }
  }
}

export { JsonLoader };
