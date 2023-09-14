import { Rcon } from "rcon-client";
import { ChildProcess, spawn } from "child_process";
import { APIEmbedField } from "discord.js";

/**
 * Minecraft server object used to control the minecraft server throught rcon.
 * All the functions return a boolean with three states:
 * True: the server is running.
 * False: the server is not running.
 * Undefined: the server is starting.
 */
export class Server {
  private process: ChildProcess | undefined;
  private rcon: Rcon | undefined;
  private starting: boolean;
  private players: Array<string> | undefined;

  constructor() {
    this.process = undefined;
    this.rcon = undefined;
    this.starting = false;
    this.players = undefined;
  }

  /**
   * Run the server in the server directory given in the .env file.
   */
  spawnServer() {
    this.process = spawn(
      "java",
      ["-Xmx7168M", "-Xms7168M", "-jar", "server.jar", "-nogui"],
      {
        cwd: process.env.MC_DIR,
      }
    );
    if (this.process) {
      this.process.stdout?.on("data", (data: any) => {
        console.log(`[MCS]: ${data}`);
      });
      this.process.stderr?.on("data", (data: any) => {
        console.error(`${data}`);
        this.process?.kill("SIGINT");
        this.process = undefined;
      });
    }
  }
  /**
   * Kill the current running server.
   */
  killServer() {
    this.process?.kill("SIGINT");
    this.process = undefined;
  }

  /**
   * Start the Minecraft server.
   * @returns a boolean showing the state of the server.
   */
  async start(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Offline) {
        this.starting = true;
        setTimeout(
          () => (this.starting = false),
          parseInt(process.env.SERVER_START_INTERVAL!)
        );

        this.spawnServer();

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
  /**
   * Stop the minecraft through rcon.
   * @returns a boolean showing the state of the server.
   */
  async stop(): Promise<ServerStatus> {
    let connection = await this.status();
    try {
      if (connection == ServerStatus.Online) {
        this.starting = true;
        setTimeout(
          () => (this.starting = false),
          parseInt(process.env.SERVER_STOP_INTERVAL!)
        );

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
        this.rcon = await Rcon.connect({
          host: process.env.MC_HOST!,
          port: parseInt(process.env.MC_RCON_PORT!),
          password: process.env.MC_RCON_PASSWORD!,
        });
      }
      let response = await this.rcon.send("list");
      if (response) {
        this.players = response
          .substring(response.indexOf(":") + 1)
          .split(" ")
          .filter((value) => value.length);
      }
    } catch (error) {
      console.log(error);
      this.rcon = undefined;
      this.players = undefined;
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
    this.players = undefined;
    this.killServer();
  }
}

export enum ServerStatus {
  Online,
  Offline,
  Starting,
}
