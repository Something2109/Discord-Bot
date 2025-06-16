import {
  SlashCommandStringOption,
  SlashCommandUserOption,
  userMention,
} from "discord.js";
import { Updater } from "../../utils/Updater";
import { Ranking } from "../../utils/database/List/WordList";
import {
  DiscordWordRankingController,
  WordRankingSubcommand,
} from "./template";
import { InteractionType } from "../../utils/controller/Discord";

type Options = {
  word?: string;
  user?: string;
};

class RankingCommand extends WordRankingSubcommand<Options, Ranking[]> {
  constructor() {
    super("ranking", "Show the local ranking of saying banned words");
  }

  async execute({ word, user }: Options) {
    return this.wordList!.ranking(word, user);
  }
}

class DiscordController extends DiscordWordRankingController<
  Options,
  Ranking[]
> {
  constructor(executor: RankingCommand) {
    super(executor);
  }

  options = () => [
    new SlashCommandUserOption()
      .setName("user")
      .setDescription("The user to search"),
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to search"),
  ];

  async extractOptions(interactions: InteractionType): Promise<Options> {
    if (interactions.isChatInputCommand()) {
      return {
        word: interactions.options.getString("word") ?? undefined,
        user: interactions.options.getUser("user")?.id,
      };
    }
    return { word: undefined, user: undefined };
  }

  async createReply(result: Ranking[]) {
    const description = result.length > 0 ? "Ranking" : "Empty list";

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

const Exe = new RankingCommand();
const Discord = new DiscordController(Exe);

export { Discord };
