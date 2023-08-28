const { Rcon } = require("rcon-client");
const childProcess = require("child_process");
const path = require("node:path");
const rootPath = path.dirname(path.dirname(__filename));

const Server = {
    rcon: undefined,
    /**
     * Start the Minecraft server.
     * @returns a boolean coordinating the starting state.
     */
    async start() {
        let connected = await this.isConnected();
        if (!connected) {
            childProcess.execFile(path.join(rootPath, "bin\\mc-server.bat"),
                function (error, stdout, stderr) {
                    if (error) {
                        console.error(error);
                    }
                }
            );
            setTimeout(() => this.starting = false, 15000);
            return false;
        } else {
            return true;
        }
    },
    /**
     * Connect the bot to the minecraft rcon.
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
     * @returns a boolean showing the state of connection.
     */
    async isConnected() {
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
     * @returns a boolean stating the stop state.
     */
    async stop() {
        try {
            let rcon = await this.connect();
            if (rcon) {
                let response = await rcon.send("stop");
                if (response) {
                    this.disconnect();
                    return true;
                }
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        return false;
    }
}

module.exports = Server;