import {
  APIEmbedField,
  TextBasedChannel,
  SlashCommandStringOption,
} from "discord.js";
import { DefaultServer, Server, ServerStatus } from "../utils/mc-server/Server";
import { DefaultUpdater, Updater } from "../utils/Updater";
import { Database } from "../utils/database/Database";
import { WorldList } from "../utils/database/List/WorldList";
import {
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../utils/controller/Executor";
import {
  InteractionType,
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../utils/controller/Discord";

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

class StartCommand extends ServerSubcommand {
  constructor() {
    super(Subcommand.Start, "Start the minecraft server");
  }

  async execute(option: OptionExtraction) {
    let status = await this.server.status();
    if (status === ServerStatus.Offline) {
      if (!option.world) return "No valid world is available run";

      this.server.world = option.world.toString();
      status = await this.server.start();
    }

    switch (status) {
      case ServerStatus.Online:
        return "Server has already started";
      case ServerStatus.Offline:
        return "Failed to start server";
      case ServerStatus.Starting:
        return "Server is starting";
    }
  }
}

class StopCommand extends ServerSubcommand {
  constructor() {
    super(Subcommand.Stop, "Stop the minecraft server");
  }

  async execute(option: OptionExtraction) {
    let status = await this.server.stop();
    switch (status) {
      case ServerStatus.Online:
        return "Failed to stop server";
      case ServerStatus.Offline:
        return "Server has already stopped";
      case ServerStatus.Starting:
        return "Server is stopping";
    }
  }
}

class StatusCommand extends ServerSubcommand {
  constructor() {
    super(Subcommand.Status, "Show the status of the minecraft server");
  }

  async execute(option: OptionExtraction) {
    const status = await this.server.status();
    switch (status) {
      case ServerStatus.Online:
        return "Server is running";
      case ServerStatus.Offline:
        return "Server is not running";
      case ServerStatus.Starting:
        return "Server is starting or stopping";
    }
  }
}

class ListCommand extends ServerSubcommand {
  constructor() {
    super(Subcommand.List, "List the players are playing in the server");
  }

  async execute(option: OptionExtraction) {
    const status = await this.server.status();
    switch (status) {
      case ServerStatus.Online:
        return this.server.playerList.length > 0
          ? "List of player"
          : "No player currently in the server";
      case ServerStatus.Offline:
        return "Server is not running";
      case ServerStatus.Starting:
        return "Server is starting or stopping";
    }
  }
}

const subcommands: DiscordSubcommandOption<Subcommand> = {
  [Subcommand.Start]: (guildId: string) => {
    const options = new SlashCommandStringOption()
      .setName("world")
      .setDescription("The world to load");
    const guildWorldList = Database.get(guildId)?.world;
    if (guildWorldList) {
      options.setChoices(...guildWorldList.worldList);
    }
    return [options];
  },
};

class ServerController extends SubcommandExecutor<
  Subcommand,
  ServerSubcommand
> {
  readonly subcommands = {
    [Subcommand.Start]: new StartCommand(),
    [Subcommand.Stop]: new StopCommand(),
    [Subcommand.Status]: new StatusCommand(),
    [Subcommand.List]: new ListCommand(),
  };

  constructor(server?: Server) {
    super("mc-server", "Minecraft server command");
    ServerSubcommand.server =
      server ?? new DefaultServer(new DefaultUpdater("Minecraft Server"));
  }
}

class DiscordServerController extends DiscordSubcommandController<
  Subcommand,
  ServerSubcommand
> {
  readonly updater: Updater;
  readonly options: DiscordSubcommandOption<Subcommand>;
  readonly executor: ServerController;
  private worldData?: WorldList;

  constructor() {
    super();
    this.options = subcommands;
    this.updater = new DefaultUpdater("Minecraft Server");
    const server = new DefaultServer(this.updater);
    this.executor = new ServerController(server);
  }

  async preExecute(interaction: InteractionType) {
    this.worldData = Database.get(interaction.guildId!)?.world;

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

  protected chooseWorld(option?: string | null) {
    if (this.worldData) {
      let worldFolder =
        this.worldData.get(option)?.value ??
        this.worldData.get(ServerSubcommand.server.world)?.value ??
        this.worldData.worldList[0]?.value;

      return worldFolder;
    }
    return undefined;
  }

  async createReply(options: OptionExtraction, description: string) {
    const world = this.worldData?.get(ServerSubcommand.server.world);
    let field: APIEmbedField[];
    if (
      options.subcommand === Subcommand.List &&
      ServerSubcommand.server.playerList.length > 0
    ) {
      field = ServerSubcommand.server.playerList.map((player) => {
        return {
          name: player.name,
          value: `Time joined: ${player.time.toLocaleString()}`,
        };
      });
    } else {
      field = [
        {
          name: "World:",
          value: world?.name ?? "No world is available now",
        },
        {
          name: "Host:",
          value:
            (await ServerSubcommand.server.host()) ??
            "Ngrok is not running or being used by other application.",
        },
      ];
    }

    return this.updater.message({
      description,
      field,
    });
  }
}

const discord = new DiscordServerController();

export { discord };
