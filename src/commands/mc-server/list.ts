import {
  CliServerController,
  DiscordServerController,
  ServerSubcommand,
} from "./template";
import { ServerStatus } from "../../utils/mc-server/Server";
import { Updater } from "../../utils/Updater";
import { BaseMessageOptions } from "discord.js";

export class ListCommand extends ServerSubcommand {
  constructor() {
    super("list", "List the players are playing in the server");
  }

  async execute() {
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

class DiscordController extends DiscordServerController {
  constructor(executor: ListCommand) {
    super(executor);
  }

  async createReply(description: string): Promise<BaseMessageOptions> {
    const field = ServerSubcommand.server.playerList.map((player) =>
      Updater.field(player.name, `Time joined: ${player.time.toLocaleString()}`)
    );
    return this.updater.message({ description, field });
  }
}

class CliController extends CliServerController {
  constructor(executor: ListCommand) {
    super(executor);
  }

  async createReply(description: string): Promise<string> {
    const players = ServerSubcommand.server.playerList.map(
      (player) =>
        `\n\t${player.name}: Time joined: ${player.time.toLocaleString()}`
    );
    return description.concat(...players);
  }
}

const Exe = new ListCommand();
const Discord = new DiscordController(Exe);
const Cli = new CliController(Exe);

export { Discord, Cli };
