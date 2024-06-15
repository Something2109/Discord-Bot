import { ServerSubcommand } from "./template";
import { ServerStatus } from "../../utils/mc-server/Server";

export class ListCommand extends ServerSubcommand {
  constructor() {
    super("list", "List the players are playing in the server");
  }

  async execute() {
    const status = await this.server.status();
    switch (status) {
      case ServerStatus.Online:
        return this.server.playerList.length > 0
          ? "List of player"
          : "No player currently in the server";
      case ServerStatus.Offline:
        return "Server is not running";
      case ServerStatus.Starting:
        return "Server is starting or stopping";
    }
  }
}
