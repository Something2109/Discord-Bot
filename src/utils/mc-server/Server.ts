import { ChildProcess, spawn } from "child_process";
import { Updater } from "../Updater";
import { Logger } from "../Logger";
import { ServerConfig } from "./ServerConfig";

/**
 * Server interface to use in other classes or functions.
 * Used to control the minecraft server.
 * Implement this to use in other default classes.
 */
interface Server {
  /**
   * Start the Minecraft server.
   * @returns The server status showing the state of the server.
   */
  start(): Promise<ServerStatus>;

  /**
   * Check if these is a connection to server.
   * @returns The server status showing the state of connection
   */
  status(): Promise<ServerStatus>;

  /**
   * Get the current world of the server if available.
   */
  get world(): string;

  /**
   * Change the world to the given world.
   * @param world The world name to change to.
   */
  set world(name: string);

  /**
   * Check if the world is in the world folder.
   * @param world The world name to check.
   */
  isAvailable(world: string): boolean;

  /**
   * Get the list of available worlds the server can run.
   */
  get worldList(): string[];

  /**
   * The list of the players.
   */
  get playerList(): Array<PlayerInfo>;

  /**
   * Get the host of the server.
   */
  host(): Promise<string | undefined>;

  /**
   * Stop the minecraftv server.
   * @returns The server status showing the state of the server.
   */
  stop(): Promise<ServerStatus>;
}

/**
 * Server status.
 */
enum ServerStatus {
  Online,
  Offline,
  Starting,
}

interface PlayerInfo {
  name: string;
  time: Date;
}

/**
 * Minecraft server class used to control the minecraft server.
 */
class DefaultServer implements Server {
  protected readonly Config: ServerConfig;

  private process: ChildProcess | undefined;
  private starting: boolean;
  private players: Array<PlayerInfo>;
  private stopTimeout?: NodeJS.Timeout;
  private updater: Updater;
  protected logger: Logger;

  constructor(updater: Updater, config?: ServerConfig) {
    this.process = undefined;
    this.starting = false;
    this.players = new Array();
    this.updater = updater;
    this.logger = new Logger("MCS");

    this.Config = config ?? new ServerConfig();
    this.logger.log(
      `Server configures with directory: ${this.Config.Directory}, arguments: ${this.Config.Arguments}`
    );
    this.logger.log(
      `World configures with directory: ${this.Config.WorldPath}, name: ${this.Config.world}`
    );
    this.logger.log(
      `Set server's timeout to ${this.Config.TimeoutTime} minutes`
    );
  }

  public async start(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Offline) {
        this.starting = true;

        this.spawnServer();

        connection = ServerStatus.Starting;
      }
    } catch (error) {
      this.logger.error(error);
      this.killServer();
    }
    return connection;
  }

  public async status(): Promise<ServerStatus> {
    let status = ServerStatus.Starting;
    if (!this.starting) {
      status = this.process ? ServerStatus.Online : ServerStatus.Offline;
    }
    return status;
  }

  get world(): string {
    return this.Config.world;
  }

  set world(name: string) {
    if (!this.process && this.Config.world !== name) {
      this.Config.world = name;
      this.logger.log(`Set the server's world to ${name}`);
    }
  }

  isAvailable(world: string) {
    return this.Config.isAvailable(world);
  }

  get worldList() {
    return this.Config.worldList;
  }

  public get playerList() {
    return this.players;
  }

  public async host() {
    return await this.Config.Host.get();
  }

  public async stop(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Online) {
        this.starting = true;

        this.sendCommand("stop");

        connection = ServerStatus.Starting;
      }
    } catch (error) {
      this.logger.error(error);
    }
    return connection;
  }

  /**
   * Run the server in the server directory given in the .env file.
   * @param updater The updater to update important info to the user.
   */
  private spawnServer() {
    this.process = spawn("java", this.Config.Arguments, {
      cwd: this.Config.Directory,
    });
    if (this.process) {
      this.process.stdout?.on("data", this.onData.bind(this));
      this.process.stderr?.on("data", this.onError.bind(this));
      this.process.on("close", this.onClose.bind(this));
    }
  }

  /**
   * Function executed when there is output from the server.
   * @param data The data from the output stream of the server process.
   */
  private onData(data: any) {
    const dataStr: string = data.toString();
    const rawMessages = dataStr.split("\n").filter((value) => value.length);
    rawMessages.forEach((rawMessage) => {
      console.log(rawMessage);
      if (this.starting) {
        this.onStarting(rawMessage);
      } else if (!rawMessage.match(/<[a-zA-Z0-9_]{2,16}>/)) {
        this.onRunning(rawMessage);
      }
    });
  }

  /**
   * Execute messages when the server is in starting state.
   * @param rawMessage The message string.
   */
  private onStarting(rawMessage: string) {
    if (rawMessage.includes("Done")) {
      this.starting = false;
      this.updater.send({
        description: "Server starts successfully",
      });
      this.stopTimeoutManager();
    }
  }

  /**
   * Execute messages when the server is in running state.
   * @param rawMessage The message string.
   */
  private onRunning(rawMessage: string) {
    const message = rawMessage
      .replace(/\[(\d|\:)*\] \[(\d|\w| |\/|\:|\#|\-)*\]\:/, "")
      .trim();

    if (message.includes("joined") || message.includes("left")) {
      this.updater.send({
        description: message,
      });
      const playerName = message.split(" ", 1)[0];

      message.includes("joined")
        ? this.addPlayerToList(playerName)
        : this.removePlayerFromList(playerName);

      this.stopTimeoutManager();
    }
  }

  /**
   * Function executed when the server process is closed.
   */
  private onClose() {
    this.updater.send({
      description: "Server stops successfully",
    });
    this.killServer();
  }

  /**
   * Function executed when there is error from the server.
   * @param data The data error string.
   */
  private onError(error: any) {
    this.logger.error(error);
    this.updater.send({ description: "Server encounters error" });
    this.killServer();
  }

  /**
   * Handle the timeout counter to close the server when there is no player playing.
   */
  private stopTimeoutManager() {
    if (this.players.length == 0 && !this.stopTimeout) {
      this.updater.send({
        description: `Server has no player playing, close in ${this.Config.TimeoutTime} minutes`,
      });

      this.stopTimeout = setTimeout(() => {
        this.updater.send({
          description: "Server is stopping due to no player playing",
        });
        this.stop();
      }, this.Config.TimeoutTime * 60000);
    } else if (this.players.length > 0 && this.stopTimeout) {
      clearTimeout(this.stopTimeout);

      this.stopTimeout = undefined;
    }
  }

  /**
   * Add a player to the list of players.
   * @param name Name of the player.
   */
  private addPlayerToList(name: string) {
    this.players.push({
      name: name,
      time: new Date(),
    });
  }

  /**
   * Remove a player to the list of players.
   * @param name Name of the player.
   */
  private removePlayerFromList(name: string) {
    const info = this.players.find((info) => info.name === name);
    if (info) {
      this.players.splice(this.players.indexOf(info), 1);
    }
  }

  /**
   * Send the command to the Minecraft server.
   * @param command The command to execute in the Minecraft server.
   * @returns The boolean showing the state of the sent command.
   */
  private sendCommand(command: string) {
    return this.process?.stdin?.write(`/${command}\n`);
  }

  /**
   * Kill the current running server.
   */
  private killServer() {
    this.process?.kill("SIGINT");
    this.process = undefined;
    this.starting = false;
    this.players.length = 0;
    clearTimeout(this.stopTimeout);
    this.stopTimeout = undefined;
  }
}

export { Server, DefaultServer, ServerStatus, PlayerInfo };
