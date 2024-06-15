import { Ngrok } from "../../utils/mc-server/Ngrok";
import { NgrokSubcommand } from "./template";

export class StopCommand extends NgrokSubcommand {
  constructor() {
    super("stop", "Stop the tunnel");
  }

  async execute() {
    this.tunnelResult = await Ngrok.stop();
    if (!this.tunnelResult) {
      return "Tunnel stops successfully.";
    }
    return "Cannot stop tunnel.";
  }
}
