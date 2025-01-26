import { ServerSubcommand } from "./template";
import { ServerStatus } from "../../utils/mc-server/Server";

export class StartCommand extends ServerSubcommand {
  constructor() {
    super("update", "Update the minecraft server");
  }

  async execute() {
    let status = await this.server.status();
    if (status !== ServerStatus.Offline) {
      return "Cannot update server while it is running";
    }

    await this.server.update();

    return "Server has been updated to the newest version";
  }
}
