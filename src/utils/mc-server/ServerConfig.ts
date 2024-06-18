import path from "node:path";
import fs from "fs";
import {
  DefaultServerHost as DefaultHost,
  DefaultNgrokServerHost as NgrokHost,
  ServerHost,
} from "./ServerHost";

interface ServerConfigAPI {}

/**
 * Responsible for creating the argument of the server and editing the server property to run smoothly.
 * Take the arguments fom the env variable to config the server.
 */
class ServerConfig {
  public readonly Directory: string;
  public readonly Arguments: Array<string>;
  public readonly Host: ServerHost;
  public readonly TimeoutTime: number;
  public readonly WorldPath: string;
  private worldName: string;

  constructor(
    directory?: string,
    fileName?: string,
    worldPath?: string,
    address?: string
  ) {
    [this.Directory, fileName] = this.pathResolver(directory, fileName);
    this.Arguments = this.argumentResolver(fileName);
    [this.WorldPath, this.worldName] = this.worldResolver(worldPath);
    this.Host = this.hostResolver(address);
    this.TimeoutTime = this.timeoutResolver();
    this.eulaResolver();
  }

  isAvailable(world: string): boolean {
    const worldDirectory = path.join(this.WorldPath, world);
    return fs.existsSync(worldDirectory);
  }

  get world(): string {
    return this.worldName;
  }

  set world(name: string) {
    this.worldName = this.writeWorldName(name);
  }

  get worldList(): string[] {
    if (fs.existsSync(this.WorldPath)) {
      return fs
        .readdirSync(this.WorldPath)
        .filter((name) =>
          fs.lstatSync(path.join(this.WorldPath, name)).isDirectory()
        );
    }
    return [];
  }

  /**
   * Set the directory based on the given parameters.
   * The default value is the specified env variables.
   * @param directory The directory to check.
   * @param filename The name of the jar file.
   * @returns The array contains the directory and server jar file to start the server.
   */
  private pathResolver(
    directory = process.env.MC_DIR,
    filename?: string
  ): string[] {
    if (!directory) {
      throw new Error("Undefined directory.");
    }

    if (!filename) {
      filename = directory.endsWith(".jar")
        ? path.basename(directory)
        : "server.jar";
    } else if (!filename.endsWith(".jar")) {
      throw new Error(`Invalid server jar file ${filename}.`);
    }

    if (directory.endsWith(".jar")) {
      directory = path.dirname(directory);
    }

    if (!fs.existsSync(path.join(directory, filename))) {
      throw new Error(`Cannot find server jar file from ${directory}.`);
    }
    return [directory, filename];
  }

  /**
   * Add the argument to start server if valid else use the default value.
   * @param fileName The jar file name to start.
   * @param initMem The initial memory given to the server when start.
   * @param maxMem The maximum memory the server will take if needed.
   * @param gui_enable Enable the GUI of the server.
   * @returns The argument array to start the server.
   */
  private argumentResolver(
    fileName: string,
    initMem = process.env.MC_INIT_MEMORY,
    maxMem = process.env.MC_MAX_MEMORY,
    gui_enable = process.env.MC_GUI
  ): string[] {
    const result = [];
    result.push(
      initMem && initMem.match(/^[0-9]*$/) ? `-Xms${initMem}M` : "-Xms2048M",
      maxMem && maxMem.match(/^[0-9]*$/) ? `-Xmx${maxMem}M` : "-Xmx4096M"
    );
    if (!(gui_enable === "true")) {
      result.push("-nogui");
    }
    result.push("-jar", fileName);
    return result;
  }

  /**
   * Set the world configuration based on the parameter.
   * The default value is the specified env variables.
   * (Must be run after the directory properties set)
   * @param directory The directory to check.
   * @returns The array contains the world path and the world name.
   */
  private worldResolver(directory = process.env.MC_WORLD_DIR) {
    if (!directory || !fs.existsSync(directory)) {
      directory = path.join(this.Directory, "world");
    }

    let name = this.readWorldName();
    if (!name) {
      name = "default";
      this.writeWorldName(name);
    }

    return [directory, name];
  }

  /**
   * Create a host for the server.
   * @param address The address of the server.
   * @returns The host of the server.
   */
  private hostResolver(
    address = process.env.MC_ADDRESS,
    port = process.env.MC_PORT
  ): ServerHost {
    if (address) {
      if (port) {
        address = address.concat(":", port);
      }
      return new DefaultHost(address);
    }
    return new NgrokHost(port);
  }

  private timeoutResolver(timeoutMinute = process.env.MC_TIMEOUT) {
    if (!timeoutMinute) {
      timeoutMinute = "5";
    }
    return parseFloat(timeoutMinute);
  }

  /**
   * Create or change the Eula file so the server can run.
   * (Must be run after the directory properties set)
   * @param directory The directory to check.
   */
  private eulaResolver(): void {
    const eulaPath = path.join(this.Directory, "eula.txt");
    if (fs.existsSync(eulaPath)) {
      const data = fs.readFileSync(eulaPath).toString();
      if (data.includes("eula=true")) {
        return;
      }
    }
    fs.writeFileSync(eulaPath, "eula=true");
  }

  /**
   * Get the level name i.e world directory from the property file of the server.
   * @returns The name of the world if exists else undefined.
   */
  private readWorldName(): string | undefined {
    const worldPath = this.readProperty("level-name");
    return worldPath ? path.basename(worldPath) : worldPath;
  }

  /**
   * Write the level name i.e world directory to the property file of the server.
   * Create one if none exist.
   * @param name The name of the world.
   */
  private writeWorldName(name: string) {
    let worldPath = path
      .join(this.WorldPath, name)
      .toString()
      .replaceAll("\\", "\\\\");

    this.writeProperty("level-name", worldPath);
    return name;
  }

  /**
   * Read the property file with the
   * @param key The property key to read.
   * @returns The value of the property if found or undefined.
   */
  public readProperty(key: string) {
    const propertyFile = path.join(this.Directory, "server.properties");
    const regex = new RegExp(`${key}=.*`);
    if (fs.existsSync(propertyFile)) {
      const fileData = fs.readFileSync(propertyFile).toString();
      const hostProperty = fileData.match(regex);
      if (hostProperty) {
        return hostProperty[0].substring(key.length + 1);
      }
    }
    return undefined;
  }

  /**
   * Write the property key and value to the property file.
   * @param key The property key to write.
   * @param value The property value to write.
   */
  public writeProperty(key: string, value: string) {
    const propertyFile = path.join(this.Directory, "server.properties");
    const regex = new RegExp(`${key}=.*`);
    let propertyData = `${key}=${value}`;
    if (fs.existsSync(propertyFile)) {
      const fileData = fs.readFileSync(propertyFile).toString();
      const worldProperty = fileData.match(regex);
      if (worldProperty) {
        propertyData = fileData.replace(worldProperty[0], propertyData);
      } else {
        propertyData = fileData.concat(propertyData);
      }
    }
    fs.writeFileSync(propertyFile, propertyData);
  }
}

export { ServerConfig };
