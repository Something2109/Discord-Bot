const { Rcon } = require("rcon-client");
const childProcess = require("child_process");
const path = require("node:path");
const rootPath = path.dirname(path.dirname(__filename));

/**
 * Minecraft server object used to control the minecraft server throught rcon.
 * All the functions return a boolean with three states:
 * True: the server is running.
 * False: the server is not running.
 * Undefined: the server is starting.
 */
const Server = {
    rcon: undefined,
    starting: false,
    players: 0,
    /**
     * Start the Minecraft server.
     * @returns a boolean showing the state of the server.
     */
    async start() {
        let connection = await this.status();
        try {
            if (connection == false) {
                this.starting = true;
                setTimeout(
                    () => this.starting = false,
                    process.env.SERVER_START_INTERVAL
                );

                childProcess.execFile(path.join(rootPath, "bin\\mc-server.bat"),
                    function (error, stdout, stderr) {
                        if (error) {
                            console.error(error);
                        }
                    }
                );

                console.log("[MCS]: Run the server start bat file");
                connection = undefined;
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        console.log(`[MCS]: Start function result: ${connection}`)
        return connection;
    },

    /**
     * Check if these is a connection to server.
     * @returns a boolean showing the state of connection 
     * or undefined if the server on starting state.
     */
    async status() {
        let status = undefined;
        if (!this.starting) {
            let connection = await this.connect();
            status = (connection instanceof Rcon);
        }
        return status;
    },
    /**
     * Stop the minecraft through rcon.
     * @returns a boolean showing the state of the server.
     */
    async stop() {
        let connection = await this.status();
        try {
            if (connection) {
                this.starting = true;
                setTimeout(
                    () => this.starting = false,
                    process.env.SERVER_STOP_INTERVAL
                );

                let response = await this.rcon.send("stop");
                if (response) {
                    await this.disconnect();
                }

                console.log(`[MCS]: Stop command response: ${response}`);
                connection = undefined;
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            await this.disconnect();
        }
        console.log(`[MCS]: Stop function result: ${connection}`);
        return connection;
    },
    /**
     * Connect the bot to the minecraft rcon and refresh the player number.
     * Shouldn't be called outside of the object to prevent outside adjustment of the rcon.
     * @returns The Rcon object if the connection established successfully else undefined.
     */
    async connect() {
        try {
            if (!this.rcon) {
                this.rcon = await Rcon.connect({
                    host: process.env.MC_HOST,
                    port: process.env.MC_RCON_PORT,
                    password: process.env.MC_RCON_PASSWORD
                })
            }
            let response = await this.rcon.send("list");
            if (response) {
                let pos = response.match(/[0-9]+/).index;
                this.players = parseInt(response.substring(pos, response.indexOf(' ', pos)));
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            this.rcon = undefined;
            this.players = 0;
        }
        console.log(`[MCS]: Testing connection result: ${this.rcon}, player: ${this.players}`);
        return this.rcon;
    },
    /**
     * Disconnect the bot from the server.
     */
    async disconnect() {
        try {
            await this.rcon.end();
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        this.rcon = undefined;
        this.players = 0;
    }
}

module.exports = Server;