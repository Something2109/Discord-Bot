import { Rcon, RconOptions } from "rcon-client";
import { ChildProcess, spawn } from "child_process";
import { ServerUpdater } from "./Updater";
import { APIEmbedField } from "discord.js";

/**
 * Minecraft server object used to control the minecraft server throught rcon.
 * All the functions return a boolean with three states:
 * True: the server is running.
 * False: the server is not running.
 * Undefined: the server is starting.
 */
export class Server {
  private readonly mcDirectory: string | undefined;
  private readonly rconOption: RconOptions;
  private readonly startInterval: number;
  private readonly stopInterval: number;

  private serverProcess: ChildProcess | undefined;
  private rcon: Rcon | undefined;
  private starting: boolean;
  private players: Array<APIEmbedField>;

  constructor() {
    this.mcDirectory = process.env.MC_DIR;
    this.rconOption = {
      host: process.env.MC_HOST ? process.env.MC_HOST : "localhost",
      port: parseInt(process.env.MC_RCON_PORT!),
      password: process.env.MC_RCON_PASSWORD!,
    };
    this.startInterval = process.env.SERVER_START_INTERVAL
      ? parseInt(process.env.SERVER_START_INTERVAL)
      : 30000;
    this.stopInterval = process.env.SERVER_STOP_INTERVAL
      ? parseInt(process.env.SERVER_STOP_INTERVAL)
      : 5000;

    this.serverProcess = undefined;
    this.rcon = undefined;
    this.starting = false;
    this.players = [];
  }

  /**
   * Run the server in the server directory given in the .env file.
   */
  spawnServer(updater: ServerUpdater) {
    this.serverProcess = spawn(
      "java",
      ["-Xmx7168M", "-Xms7168M", "-jar", "server.jar", "-nogui"],
      {
        cwd: this.mcDirectory,
      }
    );
    if (this.serverProcess) {
      this.serverProcess.stdout?.on("data", (data: any) => {
        console.log(`[MCS]: ${data}`);
        let message = data.toString();
        message = message.substring(message.lastIndexOf(":") + 1).trim();
        updater.update(message);
      });
      this.serverProcess.stderr?.on("data", (data: any) => {
        console.error(`[MCS]: Error: ${data}`);
        updater.send({ title: "Server encounters error" });
        this.killServer();
      });
    }
  }
  /**
   * Kill the current running server.
   */
  killServer() {
    this.serverProcess?.kill("SIGINT");
    this.serverProcess = undefined;
  }

  /**
   * Start the Minecraft server.
   * @returns a boolean showing the state of the server.
   */
  async start(updater: ServerUpdater): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Offline) {
        this.starting = true;
        setTimeout(() => (this.starting = false), this.startInterval);

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
   * @returns a boolean showing the state of connection
   * or undefined if the server on starting state.
   */
  async status(): Promise<ServerStatus> {
    let status = ServerStatus.Starting;
    if (!this.starting) {
      let connection = await this.connect();
      status =
        connection instanceof Rcon ? ServerStatus.Online : ServerStatus.Offline;
    }
    return status;
  }

  public get list() {
    return this.players;
  }
  /**
   * Stop the minecraft through rcon.
   * @returns a boolean showing the state of the server.
   */
  async stop(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Online) {
        this.starting = true;
        setTimeout(() => (this.starting = false), this.stopInterval);

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
  /**
   * Connect the bot to the minecraft rcon and refresh the player number.
   * Shouldn't be called outside of the object to prevent outside adjustment of the rcon.
   * @returns The Rcon object if the connection established successfully else undefined.
   */
  async connect(): Promise<Rcon | undefined> {
    try {
      if (!this.rcon) {
        this.rcon = await Rcon.connect(this.rconOption);
      }
      let response = await this.rcon.send("list uuids");
      if (response) {
        console.log(response);
        response = response.substring(response.indexOf(":") + 1).trim();
        if (response.length) {
          this.players = response
            .split(")")
            .filter((value) => value.length)
            .map((value) => {
              let player = value.trim().split(" (");
              return {
                name: player[0],
                value: player[1],
              };
            });
        } else {
          this.players.length = 0;
        }
      }
    } catch (error) {
      console.log(error);
      this.rcon = undefined;
      this.players.length = 0;
    }
    return this.rcon;
  }
  /**
   * Disconnect the bot from the server.
   */
  async disconnect(): Promise<void> {
    try {
      await this.rcon?.end();
    } catch (error) {
      console.log(error);
    }
    this.rcon = undefined;
    this.players.length = 0;
    this.killServer();
  }
}

export enum ServerStatus {
  Online,
  Offline,
  Starting,
}
