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
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../../utils/controller/Executor";
import {
  InteractionType,
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../../utils/controller/Discord";
import { CliSubcommandController } from "../../utils/controller/Console";

enum Subcommand {
  Start = "start",
  Stop = "stop",
  Status = "status",
  List = "list",
}

abstract class ServerSubcommand extends CommandExecutor {
  static server: Server;

  get server() {
    return ServerSubcommand.server;
  }
}

const discordOptions: DiscordSubcommandOption = {
  [Subcommand.Start]: (guildId: string) => {
    const options = new SlashCommandStringOption()
      .setName("world")
      .setDescription("The world to load");
    const guildWorldList = Database.get(guildId)?.get(WorldList);
    if (guildWorldList) {
      options.setChoices(...guildWorldList.worldList);
    }
    return [options];
  },
};

class ServerController extends SubcommandExecutor<ServerSubcommand> {
  constructor(server?: Server) {
    super("mc-server", "Minecraft server command");
    if (!ServerSubcommand.server) {
      ServerSubcommand.server = server ?? new DefaultServer();
    }
  }

  get server() {
    return ServerSubcommand.server;
  }
}

class DiscordServerController extends DiscordSubcommandController<ServerSubcommand> {
  readonly updater: Updater = new Updater("Minecraft Server");
  private worldData?: WorldList;

  constructor(executor: ServerController) {
    super(executor, discordOptions);
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

  async extractOptions(
    interaction: InteractionType
  ): Promise<OptionExtraction> {
    const options = await super.extractOptions(interaction);
    if (options.subcommand === Subcommand.Start && this.worldData) {
      options.world =
        this.worldData.get(options.world?.toString())?.value ??
        this.worldData.get(ServerSubcommand.server.world)?.value ??
        this.worldData.worldList[0]?.value;
    }
    return options;
  }

  async createReply(options: OptionExtraction, description: string) {
    const world = this.worldData?.get(ServerSubcommand.server.world);
    let field: APIEmbedField[];
    if (
      options.subcommand === Subcommand.List &&
      ServerSubcommand.server.playerList.length > 0
    ) {
      field = ServerSubcommand.server.playerList.map((player) =>
        Updater.field(
          player.name,
          `Time joined: ${player.time.toLocaleString()}`
        )
      );
    } else {
      const host =
        (await ServerSubcommand.server.host()) ??
        "Ngrok is not running or being used by other application.";
      field = [
        Updater.field("World:", world?.name ?? "No world is available now"),
        Updater.field("Host:", host),
      ];
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
      name: "world",
      description: "The world to load",
    },
  ],
};

class CliServerController extends CliSubcommandController<ServerSubcommand> {
  constructor(executor: ServerController) {
    super(executor, cliOptions);
  }

  async extractOptions(input: string[]) {
    const options = await super.extractOptions(input);
    if (options.subcommand && options.subcommand == Subcommand.Start) {
      const world = options.world as string;
      if (world) {
        options.world = ServerSubcommand.server.isAvailable(world)
          ? world
          : undefined;
      } else {
        options.world = ServerSubcommand.server.world;
      }
    }
    return options;
  }

  async createReply(
    { subcommand }: OptionExtraction,
    result: string
  ): Promise<string> {
    if (
      subcommand === Subcommand.List &&
      ServerSubcommand.server.playerList.length > 0
    ) {
      const players = ServerSubcommand.server.playerList.map(
        (player) =>
          `\n\t${player.name}: Time joined: ${player.time.toLocaleString()}`
      );
      result = result.concat(...players);
    } else {
      result = result.concat(
        `\n\tWorld: ${
          ServerSubcommand.server.world ?? "No world is available now"
        }`,
        `\n\tHost: ${
          (await ServerSubcommand.server.host()) ??
          "Ngrok is not running or being used by other application."
        }`
      );
    }

    return result;
  }
}

export {
  ServerSubcommand,
  ServerController,
  DiscordServerController,
  CliServerController,
};
