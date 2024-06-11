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
import { CliSubcommandController } from "../utils/controller/Console";

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
    if (!this.tunnelResult) {
      return "Tunnel stops successfully.";
    }
    return "Cannot stop tunnel.";
  }
}

const discordOptions: DiscordSubcommandOption = {
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

  async createReply(options: OptionExtraction, description: string) {
    const field = [];
    if (NgrokSubcommand.tunnelResult) {
      field.push(
        Updater.field(
          NgrokSubcommand.tunnelResult.public_url,
          NgrokSubcommand.tunnelResult.config.addr
        )
      );
      NgrokSubcommand.tunnelResult = undefined;
    }
    return this.updater.message({
      description,
      field,
    });
  }
}

const cliOptions = {
  [Subcommand.Start]: [
    {
      name: "addr",
      description: "The address of the port",
    },
  ],
};

class CliNgrokController extends CliSubcommandController<NgrokSubcommand> {
  async createReply(options: OptionExtraction, description: string) {
    const field = NgrokSubcommand.tunnelResult
      ? [
          `\n\tURL: ${NgrokSubcommand.tunnelResult.public_url}`,
          `\n\tCurrent route address: ${NgrokSubcommand.tunnelResult.config.addr}`,
        ]
      : [];
    NgrokSubcommand.tunnelResult = undefined;
    return description.concat(...field);
  }
}

const executor = new NgrokController();
const discord = new DiscordNgrokController(executor, discordOptions);
const cli = new CliNgrokController(executor, cliOptions);

export { discord, cli };
