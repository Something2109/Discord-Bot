const Ngrok = {
    async start() {
        try {
            let response = await fetch(
                `http://${process.env.NGROK_CONTROL}/api/tunnels`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        addr: process.env.MC_PORT,
                        proto: 'tcp',
                        name: process.env.NGROK_NAME
                    })
                }
            );
            if (response.ok) {
                let tunnel = await response.json();
                return tunnel;
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        return undefined;
    },
    async connect() {
        try {
            let response = await fetch(
                `http://${process.env.NGROK_CONTROL}/api/tunnels`,
                {
                    method: 'GET'
                }
            );
            if (response.ok) {
                let object = await response.json();
                let tunnel = object.tunnels;
                if (tunnel.length > 0) {
                    return tunnel[0];
                }
            }
        } catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                console.log(error);
            }
        }
        return undefined;
    },
    async stop() {
        let tunnel = await this.connect();
        if (tunnel) {
            try {
                let response = await fetch(
                    `http://${process.env.NGROK_CONTROL}/api/tunnels/${tunnel.name}`,
                    {
                        method: 'DELETE'
                    }
                );
                if (response.ok) {
                    return true;
                }
            } catch (error) {
                if (error.code !== 'ECONNREFUSED') {
                    console.log(error);
                }
            }
        }
        return undefined;
    }
}

module.exports = Ngrok;