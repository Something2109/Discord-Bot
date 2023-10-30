import { ChildProcess, spawn } from "child_process";
import { Updater } from "../Updater";
import path from "node:path";

/**
 * Minecraft server object used to control the minecraft server.
 */
class Server {
  private readonly directory: string | undefined;
  private readonly arguments: Array<string>;

  private process: ChildProcess | undefined;
  private starting: boolean;
  private players: Array<PlayerInfo>;

  constructor() {
    [this.directory, ...this.arguments] = this.pathResolver();

    this.process = undefined;
    this.starting = false;
    this.players = new Array();
  }

  /**
   * Start the Minecraft server.
   * @returns The server status showing the state of the server.
   */
  public async start(updater: Updater): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Offline) {
        this.starting = true;

        this.spawnServer(updater);

        connection = ServerStatus.Starting;
      }
    } catch (error) {
      console.log(error);
      this.killServer();
    }
    return connection;
  }

  /**
   * Check if these is a connection to server.
   * @returns The server status showing the state of connection
   */
  public async status(): Promise<ServerStatus> {
    let status = ServerStatus.Starting;
    if (!this.starting) {
      status = this.process ? ServerStatus.Online : ServerStatus.Offline;
    }
    return status;
  }

  /**
   * The list of the players.
   */
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
      console.log(error);
      this.killServer();
    }
    return connection;
  }

  /**
   * Read the server directory and the start arguments from the specified env variables.
   * @returns the array contains the directory string and the arguments to start the server.
   */
  private pathResolver() {
    if (!process.env.MC_DIR) {
      throw new Error("You need to add the server directory to env file");
    }
    const fileName = path.basename(process.env.MC_DIR);
    if (!fileName || !fileName.endsWith(".jar")) {
      throw new Error("The file in the directory is not a jar file");
    }
    const result = new Array();
    result.push(
      path.dirname(process.env.MC_DIR),
      process.env.MC_INIT_MEMORY && process.env.MC_INIT_MEMORY.match(/^[0-9]*$/)
        ? `-Xms${process.env.MC_INIT_MEMORY}M`
        : "-Xms2048M",
      process.env.MC_MAX_MEMORY && process.env.MC_MAX_MEMORY.match(/^[0-9]*$/)
        ? `-Xmx${process.env.MC_MAX_MEMORY}M`
        : "-Xmx4096M",
      "-jar",
      fileName
    );
    if (!(process.env.MC_GUI === "true")) {
      this.arguments.push("-nogui");
    }
    return result;
  }

  /**
   * Run the server in the server directory given in the .env file.
   * @param updater The updater to update important info to the user.
   */
  private spawnServer(updater: Updater) {
    this.process = spawn("java", this.arguments, {
      cwd: this.directory,
    });
    if (this.process) {
      this.process.stdout?.on("data", (data: any) => {
        const dataStr: string = data.toString();
        const rawMessages = dataStr.split("\n").filter((value) => value.length);
        rawMessages.forEach((message) => {
          console.log(`[MCS] ${message}`);
          this.update(updater, message);
        });
      });
      this.process.stderr?.on("data", (data: any) => {
        console.error(`[MCS]: Error: ${data}`);
        updater.send({ description: "Server encounters error" });
        this.killServer();
      });
      this.process.on("close", () => {
        updater.send({
          description: "Server stops successfully",
        });
        this.killServer();
      });
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
  }

  /**
   * Update the important info to the user.
   * @param updater The updater to update the info.
   * @param rawMessage The raw message from the minecraft server.
   */
  private update(updater: Updater, rawMessage: string) {
    const message = rawMessage
      .replace(/\[(\d|\:)*\] \[(\d|\w| |\/|\:|\#|\-)*\]\:/, "")
      .trim();

    if (this.starting) {
      if (message.includes("Done")) {
        this.starting = false;
        updater.send({
          description: "Server starts successfully",
        });
      }
    } else {
      if (message.includes("joined") || message.includes("left")) {
        updater.send({
          description: message,
        });
        const playerName = message.split(" ", 1)[0];

        message.includes("joined")
          ? this.addPlayerToList(playerName)
          : this.removePlayerFromList(playerName);
      }
    }
  }
}

enum ServerStatus {
  Online,
  Offline,
  Starting,
}

interface PlayerInfo {
  name: string;
  time: Date;
}

export { Server, ServerStatus };
