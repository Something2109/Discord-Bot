interface NgrokTunnel {
  name: string;
  ID: string;
  public_url: string;
  proto: string;
}

/**
 * Ngrok object used to interact with the Ngrok service.
 * All the functions return the tunnel object if these is a tunnel running
 * or undefined if these is none.
 */
class Ngrok {
  private readonly controlUrl: string;
  private readonly tunnel;

  constructor() {
    this.controlUrl = process.env.NGROK_CONTROL_URL
      ? `http://${process.env.NGROK_CONTROL_URL}/api/tunnels`
      : `http://localhost:4040/api/tunnels`;
    this.tunnel = {
      addr: process.env.MC_PORT ? process.env.MC_PORT : "25565",
      proto: "tcp",
      name: process.env.NGROK_TUNNEL_NAME
        ? process.env.NGROK_TUNNEL_NAME
        : "mc-server",
    };
  }

  /**
   * Check the running tunnel and create one if none running.
   * @returns the tunnel running or created.
   */
  async start(): Promise<NgrokTunnel | undefined> {
    let tunnel = await this.status();
    if (!tunnel) {
      tunnel = await this.create();
    }
    return tunnel;
  }
  /**
   * Get the running Ngrok tunnel.
   * @return the running tunnel or undefined if none running.
   */
  async status(): Promise<NgrokTunnel | undefined> {
    let tunnel = undefined;
    try {
      let response = await fetch(this.controlUrl, {
        method: "GET",
      });
      if (response.ok) {
        let object = await response.json();
        let tunnel_arr = object.tunnels;
        if (tunnel_arr && tunnel_arr.length > 0) {
          tunnel = tunnel_arr[0];
        }
      }
    } catch (error) {
      console.log(error);
    }
    return tunnel;
  }
  /**
   * Stop the running Ngrok tunnel.
   * @returns a boolean stating the state of the command.
   */
  async stop(): Promise<NgrokTunnel | undefined> {
    let tunnel: NgrokTunnel | undefined = await this.status();
    if (tunnel) {
      try {
        let response = await fetch(`${this.controlUrl}/${tunnel.name}`, {
          method: "DELETE",
        });
        if (response.ok) {
          tunnel = undefined;
        }
      } catch (error) {
        console.log(error);
      }
    }
    return tunnel;
  }
  /**
   * Create a ngrok tunnel to the minecraft server port.
   * @returns the tunnel started or undefined if error happens.
   */
  async create(): Promise<NgrokTunnel | undefined> {
    try {
      let response = await fetch(this.controlUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.tunnel),
      });
      if (response.ok) {
        let tunnel = await response.json();
        return tunnel;
      }
    } catch (error) {
      console.log(error);
    }
    return undefined;
  }
}

export { Ngrok, NgrokTunnel };
