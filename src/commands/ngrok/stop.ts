import { DiscordNgrokController } from "./template";
import { CliCommandController } from "../../utils/controller/Console";
import { Ngrok, NgrokTunnel } from "../../utils/mc-server/Ngrok";
import { BaseExecutor } from "../../utils/controller/Executor";
import { Updater } from "../../utils/Updater";

type Result = NgrokTunnel | undefined;

export class StopCommand extends BaseExecutor<undefined, Result> {
  constructor() {
    super("stop", "Stop the tunnel");
  }

  async execute() {
    return await Ngrok.stop();
  }
}

class DiscordController extends DiscordNgrokController<undefined, Result> {
  constructor(executor: StopCommand) {
    super(executor);
  }

  async createReply(description: Result) {
    if (!description)
      return this.updater.message({
        description: "Tunnel stops successfully.",
      });

    return this.updater.message({
      description: "Cannot stop tunnel.",
      field: [Updater.field(description.public_url, description.config.addr)],
    });
  }
}

class CliController extends CliCommandController<undefined, Result> {
  constructor(executor: StopCommand) {
    super(executor);
  }

  async createReply(description: Result) {
    if (!description) return "Tunnel stops successfully.";

    return [
      "Cannot stop tunnel.",
      `\tURL: ${description.public_url}`,
      `\tCurrent route address: ${description.config.addr}`,
    ].join("\n");
  }
}

const Exe = new StopCommand();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
