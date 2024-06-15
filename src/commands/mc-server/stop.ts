import { ServerSubcommand } from "./template";
import { ServerStatus } from "../../utils/mc-server/Server";

export class StopCommand extends ServerSubcommand {
  constructor() {
    super("stop", "Stop the minecraft server");
  }

  async execute() {
    let status = await this.server.stop();
    switch (status) {
      case ServerStatus.Online:
        return "Failed to stop server";
      case ServerStatus.Offline:
        return "Server has already stopped";
      case ServerStatus.Starting:
        return "Server is stopping";
    }
  }
}
