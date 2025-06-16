import { DiscordNgrokController } from "./template";
import { CliCommandController } from "../../utils/controller/Console";
import { Ngrok, NgrokTunnel } from "../../utils/mc-server/Ngrok";
import { BaseExecutor } from "../../utils/controller/Executor";
import { Updater } from "../../utils/Updater";

type Result = NgrokTunnel | undefined;

export class StatusCommand extends BaseExecutor<undefined, Result> {
  constructor() {
    super("status", "Show the current tunnel with address.");
  }

  async execute() {
    return await Ngrok.status();
  }
}

class DiscordController extends DiscordNgrokController<undefined, Result> {
  constructor(executor: StatusCommand) {
    super(executor);
  }

  async createReply(description: Result) {
    if (!description)
      return this.updater.message({ description: "There's no tunnel running" });

    return this.updater.message({
      description: "Tunnel:",
      field: [Updater.field(description.public_url, description.config.addr)],
    });
  }
}

class CliController extends CliCommandController<undefined, Result> {
  constructor(executor: StatusCommand) {
    super(executor);
  }

  async createReply(description: Result) {
    if (!description) return "There's no tunnel running";

    return [
      "Tunnel:",
      `\tURL: ${description.public_url}`,
      `\tCurrent route address: ${description.config.addr}`,
    ].join("\n");
  }
}

const Exe = new StatusCommand();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
