import { userMention } from "discord.js";
import { Updater } from "../../utils/Updater";
import { Ranking } from "../../utils/database/List/WordList";
import {
  DiscordWordRankingController,
  WordRankingSubcommand,
} from "./template";

export class ListCommand extends WordRankingSubcommand<undefined, Ranking[]> {
  constructor() {
    super("list", "Show the banned word list");
  }

  async execute() {
    return this.wordList!.wordList();
  }
}
class DiscordController extends DiscordWordRankingController<
  undefined,
  Ranking[]
> {
  constructor(executor: ListCommand) {
    super(executor);
  }

  async createReply(result: Ranking[]) {
    const description = result.length > 0 ? "Tracking word list" : "Empty list";

    return this.updater.message({
      description,
      field: result.map(({ id, word, count }, index) =>
        Updater.field(
          `#${index + 1}. Typed count: ${count}`,
          id ? userMention(id) : word ? word : ""
        )
      ),
    });
  }
}

const Exe = new ListCommand();
const Discord = new DiscordController(Exe);

export { Discord };
