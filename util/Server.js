const { Rcon } = require("rcon-client");
const childProcess = require("child_process");
const path = require("node:path");
const rootPath = path.dirname(path.dirname(__filename));

const Server = {
    rcon: undefined,
    async start() {
        let connected = await this.isConnected();
        if (!connected) {
            childProcess.execFile(path.join(rootPath, "bin\\mc-server.bat"),
                function (error, stdout, stderr) {
                    if (error) {
                        console.error(error);
                    }
                });
            return false;
        } else {
            return true;
        }
    },
    async connect() {
        try {
            if (!this.rcon) {
                this.rcon = await Rcon.connect({
                    host: "localhost",
                    port: 25575,
                    password: "12345678"
                })
            }
            return this.rcon;
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            return undefined;
        }
    },
    async isConnected() {
        let connection = await this.connect();
        return (connection instanceof Rcon);
    },
    async disconnect() {
        this.rcon.end();
        this.rcon = undefined;
    },
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
            return false;
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
            return false;
        }
    }
}

module.exports = Server;