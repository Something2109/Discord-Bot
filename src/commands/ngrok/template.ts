import { SlashCommandStringOption } from "discord.js";
import { Ngrok, NgrokTunnel } from "../../utils/mc-server/Ngrok";
import { Updater } from "../../utils/Updater";
import {
  OptionExtraction,
  CommandExecutor,
  SubcommandExecutor,
} from "../../utils/controller/Executor";
import {
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../../utils/controller/Discord";
import { CliSubcommandController } from "../../utils/controller/Console";

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
  }
}

class DiscordNgrokController extends DiscordSubcommandController<NgrokSubcommand> {
  readonly updater: Updater = new Updater("Ngrok");

  constructor(executor: NgrokController) {
    super(executor, discordOptions);
  }

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
  constructor(executor: NgrokController) {
    super(executor, cliOptions);
  }

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

export {
  NgrokSubcommand,
  NgrokController,
  DiscordNgrokController,
  CliNgrokController,
};
