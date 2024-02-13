import { Logger } from "../Logger";

/**
 * The interface contains basic info of the Ngrok tunnel.
 */
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
 * Ngrok interface to use in other classes or functions.
 * All the functions return the tunnel object if these is a tunnel running
 * or undefined if these is none.
 * Implement this to use in other default classes.
 */
class Ngrok {
  private static logger = new Logger("NGK");
  private static readonly controlUrl = process.env.NGROK_CONTROL_URL
    ? `http://${process.env.NGROK_CONTROL_URL}/api/tunnels`
    : `http://localhost:4040/api/tunnels`;

  /**
   * Check the running tunnel and create one if none running.
   * @returns the tunnel running or created.
   */
  public static async start(address: string): Promise<NgrokTunnel | undefined> {
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
  public static async status(): Promise<NgrokTunnel | undefined> {
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
      Ngrok.logger.error(error);
    }
    return tunnel;
  }

  /**
   * Stop the running Ngrok tunnel.
   * @returns Undefined if successful or the current running tunnel if failed
   */
  public static async stop(): Promise<NgrokTunnel | undefined> {
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
        Ngrok.logger.error(error);
      }
    }
    return tunnel;
  }

  /**
   * Create a ngrok tunnel to the minecraft server port.
   * @returns the tunnel started or undefined if error happens.
   */
  private static async create(
    address: string
  ): Promise<NgrokTunnel | undefined> {
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
      Ngrok.logger.error(error);
    }
    return undefined;
  }
}

export { Ngrok, Ngrok as DefaultNgrok, NgrokTunnel };
