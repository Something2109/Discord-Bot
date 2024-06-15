import { OptionExtraction } from "../../utils/controller/Executor";
import { Ngrok } from "../../utils/mc-server/Ngrok";
import { NgrokSubcommand } from "./template";

export class StartCommand extends NgrokSubcommand {
  constructor() {
    super("start", "Start a tunnel with the specific address");
  }

  async execute({ addr }: OptionExtraction) {
    if (addr) {
      this.tunnelResult = await Ngrok.start(addr.toString());

      if (this.tunnelResult) {
        if (this.tunnelResult.config.addr === addr.toString()) {
          return "Start tunnel successfully.";
        }
        return "Another program is using tunnel right now";
      }
    }
    return "Cannot start tunnel.";
  }
}
