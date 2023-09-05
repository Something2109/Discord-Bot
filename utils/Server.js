"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const rcon_client_1 = require("rcon-client");
const child_process_1 = __importDefault(require("child_process"));
const node_path_1 = __importDefault(require("node:path"));
const rootPath = node_path_1.default.dirname(node_path_1.default.dirname(__filename));
/**
 * Minecraft server object used to control the minecraft server throught rcon.
 * All the functions return a boolean with three states:
 * True: the server is running.
 * False: the server is not running.
 * Undefined: the server is starting.
 */
class Server {
    constructor() {
        this.starting = false;
        this.players = 0;
    }
    /**
     * Start the Minecraft server.
     * @returns a boolean showing the state of the server.
     */
    async start() {
        let connection = await this.status();
        try {
            if (connection == false) {
                this.starting = true;
                setTimeout(() => (this.starting = false), 5000);
                child_process_1.default.execFile(node_path_1.default.join(rootPath, "bin\\mc-server.bat"), function (error, stdout, stderr) {
                    if (error) {
                        console.error(error);
                    }
                });
                console.log("[MCS]: Run the server start bat file");
                connection = undefined;
            }
        }
        catch (error) {
            console.log(error);
        }
        console.log(`[MCS]: Start function result: ${connection}`);
        return connection;
    }
    /**
     * Check if these is a connection to server.
     * @returns a boolean showing the state of connection
     * or undefined if the server on starting state.
     */
    async status() {
        let status = undefined;
        if (!this.starting) {
            let connection = await this.connect();
            status = connection instanceof rcon_client_1.Rcon;
        }
        return status;
    }
    /**
     * Stop the minecraft through rcon.
     * @returns a boolean showing the state of the server.
     */
    async stop() {
        let connection = await this.status();
        try {
            if (connection && this.players == 0) {
                this.starting = true;
                setTimeout(() => (this.starting = false), 5000);
                let response = await this.rcon.send("stop");
                if (response) {
                    await this.disconnect();
                }
                console.log(`[MCS]: Stop command response: ${response}`);
                connection = undefined;
            }
        }
        catch (error) {
            console.log(error);
            await this.disconnect();
        }
        console.log(`[MCS]: Stop function result: ${connection}`);
        return connection;
    }
    /**
     * Connect the bot to the minecraft rcon and refresh the player number.
     * Shouldn't be called outside of the object to prevent outside adjustment of the rcon.
     * @returns The Rcon object if the connection established successfully else undefined.
     */
    async connect() {
        try {
            if (!this.rcon) {
                this.rcon = await rcon_client_1.Rcon.connect({
                    host: process.env.MC_HOST,
                    port: parseInt(process.env.MC_RCON_PORT),
                    password: process.env.MC_RCON_PASSWORD,
                });
            }
            let response = await this.rcon.send("list");
            if (response) {
                let pos = response.match(/[0-9]+/).index;
                this.players = parseInt(response.substring(pos, response.indexOf(" ", pos)));
            }
        }
        catch (error) {
            console.log(error);
            this.rcon = undefined;
            this.players = 0;
        }
        console.log(`[MCS]: Testing connection result: ${this.rcon}, player: ${this.players}`);
        return this.rcon;
    }
    /**
     * Disconnect the bot from the server.
     */
    async disconnect() {
        try {
            if (this.rcon) {
                await this.rcon.end();
            }
        }
        catch (error) {
            console.log(error);
        }
        this.rcon = undefined;
        this.players = 0;
    }
}
exports.Server = Server;
//# sourceMappingURL=Server.js.map