import fs from "node:fs";
import path from "path";
import { Updater } from "../Updater";
import { DefaultServer, Server } from "./Server";

/**
 * The world control interface for the server.
 * Used to change and control the server world.
 * Implement this to use in other classes.
 */
interface MultiWorldHandler {
  /**
   * Check if the world is in the world folder.
   * @param world The world name to check.
   */
  isAvailable(world: string): boolean;

  /**
   * Get the list of available worlds the server can run.
   */
  get existingWorlds(): string[];

  /**
   * Get the current world of the server if available.
   */
  get currentWorld(): string;

  /**
   * Change the world to the given world.
   * @param world The world name to change to.
   */
  set currentWorld(name: string);
}

type MultiWorldServer = Server & MultiWorldHandler;

class DefaultMultiWorldServer
  extends DefaultServer
  implements MultiWorldServer
{
  private readonly WorldDirectory;

  private worldName: string;

  constructor(updater: Updater, directory?: string, fileName?: string) {
    super(updater, directory, fileName);
    if (process.env.MC_WORLD_DIR) {
      this.WorldDirectory = process.env.MC_WORLD_DIR;
    } else {
      this.WorldDirectory = path.join(this.config.directory, "world");
    }

    let currentWorld = this.readLevelName();
    if (!currentWorld) {
      currentWorld = "default";
      this.writeLevelName(currentWorld);
    }
    this.worldName = currentWorld;
    this.logger.log(`Current world: ${this.worldName}`);
  }

  isAvailable(world: string): boolean {
    const worldDirectory = path.join(this.WorldDirectory, world);
    return fs.existsSync(worldDirectory);
  }

  get existingWorlds(): string[] {
    if (fs.existsSync(this.WorldDirectory)) {
      return fs
        .readdirSync(this.WorldDirectory)
        .filter((name) =>
          fs.lstatSync(path.join(this.WorldDirectory, name)).isDirectory()
        );
    }
    return [];
  }

  get currentWorld(): string {
    return this.worldName;
  }

  set currentWorld(name: string) {
    this.worldName = this.writeLevelName(name);
  }

  /**
   * Get the level name i.e world directory from the property file of the server.
   * @returns The name of the world if exists else undefined.
   */
  private readLevelName(): string | undefined {
    const worldPath = this.config.readProperty("level-name");
    return worldPath ? path.basename(worldPath) : worldPath;
  }

  /**
   * Write the level name i.e world directory to the property file of the server.
   * Create one if none exist.
   * @param name The name of the world.
   */
  private writeLevelName(name: string) {
    let worldPath = path
      .join(this.WorldDirectory, name)
      .toString()
      .replaceAll("\\", "\\\\");
    this.logger.log(`Set the server's world to ${name}`);

    this.config.writeProperty("level-name", worldPath);
    return name;
  }
}

export { MultiWorldServer, DefaultMultiWorldServer };
