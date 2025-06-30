import fs from "fs";
import path from "node:path";

/**
 * The class responsible for saving the important information
 * of the bot to the log files.
 */
class FileLog {
  private static date = new Date();
  private static stream = FileLog.createStream();

  static createStream() {
    const logDir = path.join(".", "log");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    return fs.createWriteStream(
      path.join(
        logDir,
        `${FileLog.date.toLocaleDateString().replaceAll("/", "-")}.txt`
      ),
      { flags: "a" }
    );
  }

  /**
   * Push the line into the save list.
   * @param line The line to save.
   */
  static push(line: string) {
    FileLog.stream.write(line + "\n");
  }
}

export default FileLog;
