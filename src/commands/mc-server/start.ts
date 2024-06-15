import { ServerSubcommand } from "./template";
import { OptionExtraction } from "../../utils/controller/Executor";
import { ServerStatus } from "../../utils/mc-server/Server";

export class StartCommand extends ServerSubcommand {
  constructor() {
    super("start", "Start the minecraft server");
  }

  async execute({ world }: OptionExtraction) {
    let status = await this.server.status();
    if (status === ServerStatus.Offline) {
      if (!world) return "No valid world is available run";

      this.server.world = world.toString();
      status = await this.server.start();
    }

    switch (status) {
      case ServerStatus.Online:
        return "Server has already started";
      case ServerStatus.Offline:
        return "Failed to start server";
      case ServerStatus.Starting:
        return "Server is starting";
    }
  }
}
