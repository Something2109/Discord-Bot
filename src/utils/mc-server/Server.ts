import { Rcon, RconOptions } from "rcon-client";
import { ChildProcess, spawn } from "child_process";
import { Updater } from "../Updater";
import path from "node:path";
/**
 * Minecraft server object used to control the minecraft server throught rcon.
 * All the functions return a boolean with three states:
 * True: the server is running.
 * False: the server is not running.
 * Undefined: the server is starting.
 */
class Server {
  private readonly mcDirectory: string | undefined;
  private readonly serverArguments: Array<string>;
  private readonly rconOption: RconOptions;

  private serverProcess: ChildProcess | undefined;
  private rcon: Rcon | undefined;
  private starting: boolean;
  private players: Array<PlayerInfo>;

  constructor() {
    [this.mcDirectory, ...this.serverArguments] = this.pathResolver();
    this.rconOption = {
      host: process.env.MC_HOST ? process.env.MC_HOST : "localhost",
      port: process.env.MC_RCON_PORT
        ? parseInt(process.env.MC_RCON_PORT)
        : 25575,
      password: process.env.MC_RCON_PASSWORD!,
    };

    this.serverProcess = undefined;
    this.rcon = undefined;
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
      this.disconnect();
    }
    return connection;
  }

  /**
   * Check if these is a connection to server.
   * @returns The server status showing the state of connection
   * or undefined if the server on starting state.
   */
  public async status(): Promise<ServerStatus> {
    let status = ServerStatus.Starting;
    if (!this.starting) {
      let connection = await this.connect();
      status =
        connection instanceof Rcon ? ServerStatus.Online : ServerStatus.Offline;
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
   * Stop the minecraft through rcon.
   * @returns The server status showing the state of the server.
   */
  public async stop(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Online) {
        this.starting = true;

        let response = await this.rcon!.send("stop");
        if (response) {
          await this.disconnect();
        }

        connection = ServerStatus.Starting;
      }
    } catch (error) {
      console.log(error);
      await this.disconnect();
    }
    return connection;
  }

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
      this.serverArguments.push("-nogui");
    }
    return result;
  }

  /**
   * Run the server in the server directory given in the .env file.
   * @param updater The updater to update important info to the user.
   */
  private spawnServer(updater: Updater) {
    this.serverProcess = spawn("java", this.serverArguments, {
      cwd: this.mcDirectory,
    });
    if (this.serverProcess) {
      this.serverProcess.stdout?.on("data", (data: any) => {
        let rawMessage = data.toString();
        this.update(updater, rawMessage);
      });
      this.serverProcess.stderr?.on("data", (data: any) => {
        console.error(`[MCS]: Error: ${data}`);
        updater.send({ description: "Server encounters error" });
        this.killServer();
      });
    }
  }

  /**
   * Connect the bot to the minecraft rcon and refresh the player number.
   * Shouldn't be called outside of the object to prevent outside adjustment of the rcon.
   * @returns The Rcon object if the connection established successfully else undefined.
   */
  private async connect(): Promise<Rcon | undefined> {
    try {
      if (!this.rcon) {
        this.rcon = await Rcon.connect(this.rconOption);
      }
      let response = await this.rcon.send("list uuids");
      if (response) {
        this.readPlayerList(response);
      }
    } catch (error) {
      console.log(error);
      this.rcon = undefined;
      this.players.length = 0;
    }
    return this.rcon;
  }

  /**
   * Disconnect the controller from the server.
   */
  private async disconnect(): Promise<void> {
    try {
      await this.rcon?.end();
    } catch (error) {
      console.log(error);
    }
    this.rcon = undefined;
    this.players.length = 0;
    this.killServer();
  }

  /**
   * Kill the current running server.
   */
  private killServer() {
    this.serverProcess?.kill("SIGINT");
    this.serverProcess = undefined;
  }

  /**
   * Update the important info to the user.
   * @param updater The updater to update the info.
   * @param rawMessage The raw message from the minecraft server.
   */
  private update(updater: Updater, rawMessage: string) {
    const messages = rawMessage
      .split("\n")
      .filter((value) => value.length)
      .map((message) =>
        message.replace(/\[(\d|\:)*\] \[(\d|\w| |\/|\:|\#|\-)*\]\:/, "").trim()
      );
    for (const message of messages) {
      console.log(`[MCS]: ${message}`);

      if (message.includes("joined") || message.includes("left")) {
        updater.send({
          description: message.trim(),
        });
      } else if (message.includes("started") && this.starting) {
        this.starting = false;
        updater.send({
          description: "Server starts successfully",
        });
      } else if (message.includes("stopped") && this.starting) {
        this.starting = false;
        updater.send({
          description: "Server stops successfully",
        });
      }
    }
  }

  /**
   * Read raw player list to update to the controller.
   * @param response The raw response to the server.
   */
  private readPlayerList(response: string) {
    const rawPlayerList = response.substring(response.indexOf(":") + 1).trim();
    if (rawPlayerList.length) {
      this.players = rawPlayerList
        .split(")")
        .filter((value) => value.length)
        .map((value) => {
          let player = value.trim().split(" (");
          return {
            name: player[0],
            uuid: player[1],
          };
        });
    } else {
      this.players.length = 0;
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
  uuid: string;
}

export { Server, ServerStatus };
