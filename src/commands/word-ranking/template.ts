import {
  APIEmbedField,
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandStringOption,
  SlashCommandUserOption,
  userMention,
} from "discord.js";
import { Updater } from "../../utils/Updater";
import { Database } from "../../utils/database/Database";
import { BannedWordList, Ranking } from "../../utils/database/List/WordList";
import {
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../../utils/controller/Executor";
import {
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../../utils/controller/Discord";

type InteractionType = ChatInputCommandInteraction;

enum SubcommandNames {
  Add = "add",
  List = "list",
  Remove = "remove",
  Ranking = "ranking",
}

abstract class WordRankingSubcommand extends CommandExecutor {
  static wordList?: BannedWordList;
  static result: Ranking[];

  get wordList() {
    return WordRankingSubcommand.wordList;
  }

  set wordList(list: BannedWordList | undefined) {
    WordRankingSubcommand.wordList = list;
  }

  get result() {
    return WordRankingSubcommand.result;
  }

  set result(result: Ranking[]) {
    WordRankingSubcommand.result = result;
  }
}

const discordOptions: DiscordSubcommandOption = {
  [SubcommandNames.Add]: () => [
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to track")
      .setRequired(true),
  ],
  [SubcommandNames.Ranking]: () => [
    new SlashCommandUserOption()
      .setName("user")
      .setDescription("The user to search"),
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to search"),
  ],
  [SubcommandNames.Remove]: () => [
    new SlashCommandStringOption()
      .setName("word")
      .setDescription("The word to delete")
      .setRequired(true),
  ],
};

class WordRankingController extends SubcommandExecutor<WordRankingSubcommand> {
  constructor() {
    super("word-ranking", "Tracking and ranking words");
  }
}

class DiscordWordRankingController extends DiscordSubcommandController<WordRankingSubcommand> {
  readonly updater: Updater = new Updater("Word ranking");

  constructor(executor: WordRankingController) {
    super(executor, discordOptions);
  }

  async preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    WordRankingSubcommand.wordList = Database.get(
      interaction.guild?.id
    )?.bannedWord;
    WordRankingSubcommand.result = [];
    return undefined;
  }

  async createReply(options: OptionExtraction, description: string) {
    let field: APIEmbedField[] = [];
    if (
      options.subcommand == SubcommandNames.List ||
      options.subcommand == SubcommandNames.Ranking
    ) {
      field = WordRankingSubcommand.result?.map(({ id, word, count }, index) =>
        Updater.field(
          `#${index + 1}. Typed count: ${count}`,
          id ? userMention(id) : word ? word : ""
        )
      );
    }
    return this.updater.message({
      description,
      field,
    });
  }
}

export {
  WordRankingSubcommand,
  WordRankingController,
  DiscordWordRankingController,
};
