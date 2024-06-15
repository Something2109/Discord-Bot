import { ServerSubcommand } from "./template";
import { ServerStatus } from "../../utils/mc-server/Server";

export class StatusCommand extends ServerSubcommand {
  constructor() {
    super("status", "Show the status of the minecraft server");
  }

  async execute() {
    const status = await this.server.status();
    switch (status) {
      case ServerStatus.Online:
        return "Server is running";
      case ServerStatus.Offline:
        return "Server is not running";
      case ServerStatus.Starting:
        return "Server is starting or stopping";
    }
  }
}
