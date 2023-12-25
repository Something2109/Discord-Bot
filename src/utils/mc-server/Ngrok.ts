import { Logger } from "../Logger";

/**
 * Ngrok interface to use in other classes or functions.
 * All the functions return the tunnel object if these is a tunnel running
 * or undefined if these is none.
 * Implement this to use in other default classes.
 */
interface Ngrok {
  /**
   * Check the running tunnel and create one if none running.
   * @returns the tunnel running or created.
   */
  start(address?: string): Promise<NgrokTunnel | undefined>;

  /**
   * Get the running Ngrok tunnel.
   * @return the running tunnel or undefined if none running.
   */
  status(): Promise<NgrokTunnel | undefined>;

  /**
   * Stop the running Ngrok tunnel.
   * @returns Undefined if successful or the current running tunnel if failed
   */
  stop(): Promise<NgrokTunnel | undefined>;

  /**
   * Check if the tunnel is the minecraft tunnel.
   * @param tunnel The tunnel to check.
   * @returns The boolean specified the result.
   */
  isMcTunnel(tunnel: NgrokTunnel | undefined): boolean;
}

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
 * Default Ngrok class used to interact with the Ngrok service.
 */
class DefaultNgrok implements Ngrok {
  private static logger: Logger;
  private readonly controlUrl: string;
  private readonly mcTunnel: string;

  constructor(
    controlUrl: string | undefined = process.env.NGROK_CONTROL_URL,
    mcHost: string | undefined = process.env.MC_HOST,
    mcPort: string | undefined = process.env.MC_PORT
  ) {
    if (!DefaultNgrok.logger) {
      DefaultNgrok.logger = new Logger("NGK");
    }

    this.controlUrl = controlUrl
      ? `http://${controlUrl}/api/tunnels`
      : `http://localhost:4040/api/tunnels`;
    this.mcTunnel = `${mcHost ? mcHost : "localhost"}:${
      mcPort ? mcPort : "25565"
    }`;
  }

  public async start(
    address: string = this.mcTunnel
  ): Promise<NgrokTunnel | undefined> {
    let tunnel = await this.status();
    if (!tunnel) {
      tunnel = await this.create(address);
    }
    return tunnel;
  }

  public async status(): Promise<NgrokTunnel | undefined> {
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
      DefaultNgrok.logger.error(error);
    }
    return tunnel;
  }

  public async stop(): Promise<NgrokTunnel | undefined> {
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
        DefaultNgrok.logger.error(error);
      }
    }
    return tunnel;
  }

  public isMcTunnel(tunnel: NgrokTunnel | undefined): boolean {
    return tunnel?.config.addr === this.mcTunnel;
  }

  /**
   * Create a ngrok tunnel to the minecraft server port.
   * @returns the tunnel started or undefined if error happens.
   */
  private async create(address: string): Promise<NgrokTunnel | undefined> {
    try {
      let response = await fetch(this.controlUrl, {
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
      DefaultNgrok.logger.error(error);
    }
    return undefined;
  }
}

export { Ngrok, DefaultNgrok, NgrokTunnel };
