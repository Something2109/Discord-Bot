interface NgrokTunnel {
  name: string;
  ID: string;
  public_url: string;
  proto: string;
  config: {
    addr: string;
  };
}

/**
 * Ngrok object used to interact with the Ngrok service.
 * All the functions return the tunnel object if these is a tunnel running
 * or undefined if these is none.
 */
class Ngrok {
  private static readonly controlUrl = process.env.NGROK_CONTROL_URL
    ? `http://${process.env.NGROK_CONTROL_URL}/api/tunnels`
    : `http://localhost:4040/api/tunnels`;
  private static readonly mcTunnel = `${
    process.env.MC_HOST ? process.env.MC_HOST : "localhost"
  }:${process.env.MC_PORT ? process.env.MC_PORT : "25565"}`;

  /**
   * Check the running tunnel and create one if none running.
   * @returns the tunnel running or created.
   */
  public async start(
    address: string = Ngrok.mcTunnel
  ): Promise<NgrokTunnel | undefined> {
    let tunnel = await this.status();
    if (!tunnel) {
      tunnel = await this.create(address);
    }
    return tunnel;
  }
  /**
   * Get the running Ngrok tunnel.
   * @return the running tunnel or undefined if none running.
   */
  public async status(): Promise<NgrokTunnel | undefined> {
    let tunnel = undefined;
    try {
      let response = await fetch(Ngrok.controlUrl, {
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
   * @returns Undefined if successful or the current running tunnel if failed
   */
  public async stop(): Promise<NgrokTunnel | undefined> {
    let tunnel: NgrokTunnel | undefined = await this.status();
    if (tunnel) {
      try {
        let response = await fetch(`${Ngrok.controlUrl}/${tunnel.name}`, {
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
   * Check if the tunnel is the minecraft tunnel.
   * @param tunnel The tunnel to check.
   * @returns The boolean specified the result.
   */
  public static isMcTunnel(tunnel: NgrokTunnel): boolean {
    return tunnel?.config.addr === Ngrok.mcTunnel;
  }
  /**
   * Create a ngrok tunnel to the minecraft server port.
   * @returns the tunnel started or undefined if error happens.
   */
  private async create(address: string): Promise<NgrokTunnel | undefined> {
    try {
      let response = await fetch(Ngrok.controlUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addr: address,
          proto: "tcp",
          name: "tunnel",
        }),
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
