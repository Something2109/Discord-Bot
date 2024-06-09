import { SlashCommandStringOption } from "discord.js";
import { Ngrok, NgrokTunnel } from "../utils/mc-server/Ngrok";
import { Updater } from "../utils/Updater";
import {
  OptionExtraction,
  CommandExecutor,
  SubcommandExecutor,
} from "../utils/controller/Executor";
import {
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../utils/controller/Discord";

enum Subcommand {
  Start = "start",
  Status = "status",
  Stop = "stop",
}

abstract class NgrokSubcommand extends CommandExecutor {
  static tunnelResult: NgrokTunnel | undefined;

  get tunnelResult() {
    return NgrokSubcommand.tunnelResult;
  }

  set tunnelResult(tunnel: NgrokTunnel | undefined) {
    NgrokSubcommand.tunnelResult = tunnel;
  }
}

class StartCommand extends NgrokSubcommand {
  constructor() {
    super(Subcommand.Start, "Start a tunnel with the specific address");
  }

  async execute(options: OptionExtraction) {
    const address = options["addr"] as string;
    this.tunnelResult = address ? await Ngrok.start(address) : undefined;

    if (this.tunnelResult) {
      if (this.tunnelResult.config.addr === address) {
        return "Start tunnel successfully.";
      }
      return "Another program is using tunnel right now";
    }
    return "Cannot start tunnel.";
  }
}

class StatusCommand extends NgrokSubcommand {
  constructor() {
    super(Subcommand.Status, "Show the current tunnel with address.");
  }

  async execute() {
    this.tunnelResult = await Ngrok.status();
    if (this.tunnelResult) {
      return "Tunnel:";
    }
    return "There's no tunnel running";
  }
}

class StopCommand extends NgrokSubcommand {
  constructor() {
    super(Subcommand.Stop, "Stop the tunnel");
  }

  async execute() {
    this.tunnelResult = await Ngrok.stop();
    if (this.tunnelResult) {
      return "Tunnel stops successfully.";
    }
    return "Cannot stop tunnel.";
  }
}

const options: DiscordSubcommandOption = {
  [Subcommand.Start]: () => [
    new SlashCommandStringOption()
      .setName("addr")
      .setDescription("The address of the port")
      .setRequired(true),
  ],
};

class NgrokController extends SubcommandExecutor<NgrokSubcommand> {
  constructor() {
    super("ngrok", "Ngrok tunnel controller");
    this.add(StartCommand, StatusCommand, StopCommand);
  }
}

class DiscordNgrokController extends DiscordSubcommandController<NgrokSubcommand> {
  readonly updater: Updater = new Updater("Ngrok");

  async getDiscordReply(options: OptionExtraction, description: string) {
    const field = NgrokSubcommand.tunnelResult
      ? [
          {
            name: NgrokSubcommand.tunnelResult.public_url,
            value: NgrokSubcommand.tunnelResult.config.addr,
          },
        ]
      : [];
    NgrokSubcommand.tunnelResult = undefined;
    return this.updater.message({
      description: description,
      field,
    });
  }
}

const executor = new NgrokController();
const discord = new DiscordNgrokController(executor, options);

export { discord };
