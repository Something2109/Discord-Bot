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
    process: undefined,
    rcon: undefined,
    starting: false,
    players: undefined,

    /**
     * Run the server in the server directory given in the .env file.
     */
    spawnServer() {
        this.process = childProcess.spawn('java',
            ['-Xmx7168M', '-Xms7168M', '-jar', 'server.jar', '-nogui'], {
            cwd: process.env.MC_DIR,
        });
        this.process.stdout.on('data', (data) => {
            console.log(`[MCS]: ${data}`);
        });
        this.process.stderr.on('data', (data) => {
            console.error(`${data}`);
            this.process.kill('SIGINT');
            this.process = undefined;
        });
    },
    /**
     * Kill the current running server.
     */
    killServer() {
        if (this.process) {
            this.process.kill('SIGINT');
            this.process = undefined;
        }
    },
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

                this.spawnServer();

                connection = undefined;
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            this.disconnect();
        }
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

                connection = undefined;
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            await this.disconnect();
        }
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
                this.players = response.substring(response.indexOf(':') + 1)
                    .split(' ')
                    .filter((value) => value.length);
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            this.rcon = undefined;
            this.players = undefined;
        }
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
        this.players = undefined;
        this.killServer();
    }
}

module.exports = Server;