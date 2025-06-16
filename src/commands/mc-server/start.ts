import {
  CliServerController,
  DiscordServerController,
  ServerSubcommand,
} from "./template";
import { Database } from "../../utils/database/Database";
import { WorldList } from "../../utils/database/List/WorldList";
import { ServerStatus } from "../../utils/mc-server/Server";
import { Updater } from "../../utils/Updater";
import { BaseMessageOptions, SlashCommandStringOption } from "discord.js";
import { InteractionType } from "../../utils/controller/Discord";

type Options = { world: string | undefined };

export class StartCommand extends ServerSubcommand<Options> {
  constructor() {
    super("start", "Start the minecraft server");
  }

  async execute({ world }: Options) {
    let status = await this.server.status();
    if (status === ServerStatus.Offline) {
      if (!world) return "No valid world is available run";

      this.server.world = world.toString();
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

class DiscordController extends DiscordServerController<Options> {
  constructor(executor: StartCommand) {
    super(executor);
  }

  options = (guildId: string) => {
    const options = new SlashCommandStringOption()
      .setName("world")
      .setDescription("The world to load");
    const guildWorldList = Database.get(guildId)?.get(WorldList);
    if (guildWorldList) {
      options.setChoices(...guildWorldList.worldList);
    }
    return [options];
  };

  async extractOptions(interaction: InteractionType): Promise<Options> {
    if (interaction.isChatInputCommand()) {
      let world = interaction.options.getString("world");

      if (this.worldData) {
        world =
          this.worldData.get(world?.toString())?.value ??
          this.worldData.get(ServerSubcommand.server.world)?.value ??
          this.worldData.worldList[0]?.value;

        return { world };
      }
    }

    return { world: undefined };
  }

  async createReply(description: string): Promise<BaseMessageOptions> {
    const field = ServerSubcommand.server.playerList.map((player) =>
      Updater.field(player.name, `Time joined: ${player.time.toLocaleString()}`)
    );
    return this.updater.message({ description, field });
  }
}

class CliController extends CliServerController<Options> {
  constructor(executor: StartCommand) {
    super(executor);
  }

  options = [{ name: "world", description: "The world to load" }];

  async extractOptions(input: string[]) {
    let world = input.shift();
    if (world) {
      world = ServerSubcommand.server.isAvailable(world) ? world : undefined;
    } else {
      world = ServerSubcommand.server.world;
    }

    return { world };
  }

  async createReply(description: string): Promise<string> {
    const players = ServerSubcommand.server.playerList.map(
      (player) =>
        `\n\t${player.name}: Time joined: ${player.time.toLocaleString()}`
    );
    return description.concat(...players);
  }
}

const Exe = new StartCommand();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
