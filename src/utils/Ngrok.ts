export interface NgrokTunnel {
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
export class Ngrok {
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
      let response = await fetch(
        `http://${process.env.NGROK_CONTROL}/api/tunnels`,
        {
          method: "GET",
        }
      );
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
        let response = await fetch(
          `http://${process.env.NGROK_CONTROL}/api/tunnels/${tunnel.name}`,
          {
            method: "DELETE",
          }
        );
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
      let response = await fetch(
        `http://${process.env.NGROK_CONTROL}/api/tunnels`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            addr: process.env.MC_PORT,
            proto: "tcp",
            name: process.env.NGROK_NAME,
          }),
        }
      );
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
