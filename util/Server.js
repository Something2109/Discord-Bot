const { Rcon } = require("rcon-client");
const childProcess = require("child_process");
const path = require("node:path");
const rootPath = path.dirname(path.dirname(__filename));

const Server = {
    rcon: undefined,
    starting: false,
    /**
     * Start the Minecraft server.
     * @returns a boolean showing the state of the server before start.
     */
    async start() {
        let connection = await this.isConnected();
        if (connection == false) {
            this.starting = true;
            childProcess.execFile(path.join(rootPath, "bin\\mc-server.bat"),
                function (error, stdout, stderr) {
                    if (error) {
                        console.error(error);
                    }
                }
            );
            setTimeout(() => this.starting = false, 15000);
        }
        return connection;
    },
    /**
     * Connect the bot to the minecraft rcon.
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
            return this.rcon;
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        return undefined;
    },
    /**
     * Check if these is a connection to server.
     * @returns a boolean showing the state of connection 
     * or undefined if the server on starting state.
     */
    async isConnected() {
        if (this.starting) {
            return undefined;
        }
        let connection = await this.connect();
        return (connection instanceof Rcon);
    },
    /**
     * Disconnect the bot from the server.
     */
    async disconnect() {
        this.rcon.end();
        this.rcon = undefined;
    },
    /**
     * Stop the minecraft through rcon.
     * @returns a boolean showing the state of the server before stop.
     */
    async stop() {
        let connection = await this.isConnected();
        try {
            if (connection) {
                let response = await this.rcon.send("stop");
                if (response) {
                    this.disconnect();
                }
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        return connection;
    }
}

module.exports = Server;