import { ChildProcess, spawn } from "child_process";
import { Updater } from "../Updater";
import path from "node:path";
import fs from "fs";
import { Logger } from "../Logger";

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
   * The list of the players.
   */
  get list(): Array<PlayerInfo>;

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
  protected readonly directory: string;
  private readonly arguments: Array<string>;
  private readonly timeoutMin: number;

  private process: ChildProcess | undefined;
  private starting: boolean;
  private players: Array<PlayerInfo>;
  private stopTimeout?: NodeJS.Timeout;
  private updater: Updater;
  protected logger: Logger;

  constructor(updater: Updater, directory?: string, fileName?: string) {
    [this.directory, fileName] = this.pathResolver(directory, fileName);
    this.arguments = this.argumentResolver();
    this.arguments.push("-jar", fileName);
    this.timeoutMin = process.env.MC_TIMEOUT
      ? parseFloat(process.env.MC_TIMEOUT)
      : 6;
    this.eulaResolver();

    this.process = undefined;
    this.starting = false;
    this.players = new Array();
    this.updater = updater;
    this.logger = new Logger("MCS");

    this.logger.log(
      `Server configures with directory: ${this.directory}, arguments: ${this.arguments}`
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
      const logError = error as Error;
      this.logger.error(logError.message);
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

  public get list() {
    return this.players;
  }

  /**
   * Stop the minecraftv server.
   * @returns The server status showing the state of the server.
   */
  public async stop(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Online) {
        this.starting = true;

        this.sendCommand("stop");

        connection = ServerStatus.Starting;
      }
    } catch (error) {
      const logError = error as Error;
      this.logger.error(logError.message);
    }
    return connection;
  }

  /**
   * Check the validity of the directory if given else the specified env variables.
   * @param directory The directory to check.
   * @param filename The filename of the jar file.
   * @returns The array contains the directory and server jar file to start the server.
   */
  private pathResolver(
    directory = process.env.MC_DIR,
    filename?: string
  ): string[] {
    if (!directory) {
      throw new Error("Undefined directory.");
    }
    if (directory.endsWith(".jar")) {
      directory = path.dirname(directory);
    }

    if (!filename) {
      filename = directory.endsWith(".jar")
        ? path.basename(directory)
        : "server.jar";
    } else if (!filename.endsWith(".jar")) {
      throw new Error(`Invalid server jar file ${filename}.`);
    }

    if (!fs.existsSync(path.join(directory, filename))) {
      throw new Error(`Cannot find server jar file from ${directory}.`);
    }
    return [directory, filename];
  }

  /**
   * Add the argument to start server if valid else use the default value.
   * @param initMem The initial memory given to the server when start.
   * @param maxMem The maximum memory the server will take if needed.
   * @param gui_enable Enable the GUI of the server.
   * @returns The argument array to start the server.
   */
  private argumentResolver(
    initMem = process.env.MC_INIT_MEMORY,
    maxMem = process.env.MC_MAX_MEMORY,
    gui_enable = process.env.MC_GUI
  ): string[] {
    const result = new Array();
    result.push(
      initMem && initMem.match(/^[0-9]*$/) ? `-Xms${initMem}M` : "-Xms2048M",
      maxMem && maxMem.match(/^[0-9]*$/) ? `-Xmx${maxMem}M` : "-Xmx4096M"
    );
    if (!(gui_enable === "true")) {
      result.push("-nogui");
    }
    return result;
  }

  /**
   * Create or change the Eula file so the server can run.
   */
  private eulaResolver(): void {
    const eulaPath = path.join(this.directory, "eula.txt");
    if (fs.existsSync(eulaPath)) {
      const data = fs.readFileSync(eulaPath).toString();
      if (data.includes("eula=true")) {
        return;
      }
    }
    fs.writeFileSync(eulaPath, "eula=true");
  }

  /**
   * Run the server in the server directory given in the .env file.
   * @param updater The updater to update important info to the user.
   */
  private spawnServer() {
    this.process = spawn("java", this.arguments, {
      cwd: this.directory,
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
    const logError = error as Error;
    this.logger.error(logError.message);
    this.updater.send({ description: "Server encounters error" });
    this.killServer();
  }

  /**
   * Handle the timeout counter to close the server when there is no player playing.
   */
  private stopTimeoutManager() {
    if (this.players.length == 0 && !this.stopTimeout) {
      this.updater.send({
        description: `Server has no player playing, close in ${this.timeoutMin} minutes`,
      });

      this.stopTimeout = setTimeout(() => {
        this.updater.send({
          description: "Server is stopping due to no player playing",
        });
        this.stop();
      }, this.timeoutMin * 60000);
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
