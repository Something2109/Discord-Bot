import { Ngrok } from "../../utils/mc-server/Ngrok";
import { NgrokSubcommand } from "./template";

export class StatusCommand extends NgrokSubcommand {
  constructor() {
    super("status", "Show the current tunnel with address.");
  }

  async execute() {
    this.tunnelResult = await Ngrok.status();
    if (this.tunnelResult) {
      return "Tunnel:";
    }
    return "There's no tunnel running";
  }
}
