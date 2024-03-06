import { Ngrok } from "./Ngrok";

interface ServerHost {
  /**
   * Get the running host address.
   * @return the host address or undefined if none running.
   */
  get(): Promise<string | undefined>;
}

class DefaultServerHost implements ServerHost {
  private host: string;

  constructor(host: string) {
    this.host = host;
  }

  async get(): Promise<string | undefined> {
    return this.host;
  }
}

class DefaultNgrokServerHost implements ServerHost {
  private address: string;

  constructor(port: string = "25565") {
    this.address = `localhost:${port}`;
  }

  async get(): Promise<string | undefined> {
    const tunnel = await Ngrok.start(this.address);

    if (tunnel?.config.addr === this.address) {
      return tunnel?.public_url;
    }
    return undefined;
  }
}

export { ServerHost, DefaultServerHost, DefaultNgrokServerHost };
