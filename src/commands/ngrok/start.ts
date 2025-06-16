import { SlashCommandStringOption } from "discord.js";
import { DiscordNgrokController } from "./template";
import { CliCommandController } from "../../utils/controller/Console";
import { Ngrok, NgrokTunnel } from "../../utils/mc-server/Ngrok";
import { BaseExecutor } from "../../utils/controller/Executor";
import { InteractionType } from "../../utils/controller/Discord";
import { Updater } from "../../utils/Updater";

type Options = { addr: string };
type Result = NgrokTunnel | undefined;

class StartCommand extends BaseExecutor<Options, Result> {
  constructor() {
    super("start", "Start a tunnel with the specific address");
  }

  async execute({ addr }: Options) {
    return await Ngrok.start(addr);
  }
}

class DiscordController extends DiscordNgrokController<Options, Result> {
  constructor(executor: StartCommand) {
    super(executor);
  }

  options = () => [
    new SlashCommandStringOption()
      .setName("addr")
      .setDescription("The address of the port")
      .setRequired(true),
  ];

  async extractOptions(interaction: InteractionType): Promise<Options> {
    if (interaction.isChatInputCommand()) {
      return { addr: interaction.options.getString("addr", true) };
    }
    return { addr: "" };
  }

  async createReply(description: Result, { addr }: Options) {
    if (!description)
      return this.updater.message({ description: "Cannot start tunnel." });

    if (description.config.addr !== addr)
      return this.updater.message({
        description: "Another program is using tunnel right now",
      });

    return this.updater.message({
      description: "Start tunnel successfully.",
      field: [Updater.field(description.public_url, description.config.addr)],
    });
  }
}

class CliController extends CliCommandController<Options, Result> {
  constructor(executor: StartCommand) {
    super(executor);
  }

  options = [{ name: "addr", description: "The address of the port" }];

  async extractOptions(input: string[]): Promise<Options> {
    const addr = input.shift();
    return { addr: addr ?? "" };
  }

  async createReply(description: Result, { addr }: Options) {
    if (!description) return "Cannot start tunnel.";

    if (description.config.addr !== addr)
      return "Another program is using tunnel right now";

    return [
      "Start tunnel successfully.",
      `\tURL: ${description.public_url}`,
      `\tCurrent route address: ${description.config.addr}`,
    ].join("\n");
  }
}

const Exe = new StartCommand();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
