import {
  APIEmbedField,
  TextBasedChannel,
  SlashCommandStringOption,
} from "discord.js";
import {
  DefaultServer,
  Server,
  ServerStatus,
} from "../../utils/mc-server/Server";
import { Updater } from "../../utils/Updater";
import { Database } from "../../utils/database/Database";
import { WorldList } from "../../utils/database/List/WorldList";
import {
  BaseExecutor,
  OptionExtraction,
} from "../../utils/controller/Executor";
import {
  InteractionType,
  DiscordCommandController,
} from "../../utils/controller/Discord";
import { CliCommandController } from "../../utils/controller/Console";

type Result = string;

abstract class ServerSubcommand<
  Options extends OptionExtraction | undefined = undefined
> extends BaseExecutor<Options, Result> {
  static server: Server = new DefaultServer();

  get server() {
    return ServerSubcommand.server;
  }
}

class DiscordServerController<
  Options extends OptionExtraction | undefined = undefined
> extends DiscordCommandController<Options, Result> {
  readonly updater: Updater = new Updater("Minecraft Server");
  protected worldData?: WorldList;

  constructor(executor: ServerSubcommand<Options>) {
    super(executor);
    ServerSubcommand.server.updater = this.updater;
  }

  async preExecute(interaction: InteractionType) {
    this.worldData = Database.get(interaction.guildId!)?.get(WorldList);

    const status = await ServerSubcommand.server.status();
    if (
      status !== ServerStatus.Offline &&
      !this.worldData?.get(ServerSubcommand.server.world)
    ) {
      return this.updater.message({
        description: "Server is running in another guild.",
      });
    }

    this.updater.channel = interaction.channel as TextBasedChannel;
    return undefined;
  }

  async createReply(description: string) {
    const world = this.worldData?.get(ServerSubcommand.server.world);
    const host =
      (await ServerSubcommand.server.host()) ??
      "Ngrok is not running or being used by other application.";
    const field = [
      Updater.field("World:", world?.name ?? "No world is available now"),
      Updater.field("Host:", host),
    ];

    return this.updater.message({ description, field });
  }
}

class CliServerController<
  Options extends OptionExtraction | undefined = undefined
> extends CliCommandController<Options, Result> {
  constructor(executor: ServerSubcommand<Options>) {
    super(executor);
  }

  async createReply(result: string): Promise<string> {
    return result.concat(
      `\n\tWorld: ${
        ServerSubcommand.server.world ?? "No world is available now"
      }`,
      `\n\tHost: ${
        (await ServerSubcommand.server.host()) ??
        "Ngrok is not running or being used by other application."
      }`
    );
  }
}

export { ServerSubcommand, DiscordServerController, CliServerController };
