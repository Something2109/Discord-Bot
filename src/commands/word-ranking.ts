import {
  APIEmbedField,
  BaseMessageOptions,
  ChatInputCommandInteraction,
  SlashCommandStringOption,
  SlashCommandUserOption,
  userMention,
} from "discord.js";
import { Updater } from "../utils/Updater";
import { Database } from "../utils/database/Database";
import { BannedWordList, Ranking } from "../utils/database/List/WordList";
import {
  CommandExecutor,
  OptionExtraction,
  SubcommandExecutor,
} from "../utils/controller/Executor";
import {
  DiscordSubcommandController,
  DiscordSubcommandOption,
} from "../utils/controller/Discord";

type InteractionType = ChatInputCommandInteraction;

enum SubcommandNames {
  Add = "add",
  List = "list",
  Remove = "remove",
  Ranking = "ranking",
}

abstract class NgrokSubcommandController extends CommandExecutor {
  static wordList?: BannedWordList;
  static result: Ranking[];

  get wordList() {
    return NgrokSubcommandController.wordList;
  }

  set wordList(list: BannedWordList | undefined) {
    NgrokSubcommandController.wordList = list;
  }

  get result() {
    return NgrokSubcommandController.result;
  }

  set result(result: Ranking[]) {
    NgrokSubcommandController.result = result;
  }
}

class AddCommand extends NgrokSubcommandController {
  constructor() {
    super(SubcommandNames.Add, "Add word to ban");
  }

  async execute(options: OptionExtraction) {
    if (this.wordList) {
      const word = this.wordList.add(options["word"] as string);
      this.result = this.wordList.wordList();
      if (word) {
        return `Added the word ${word} to the tracking list.`;
      }
    }
    return `Failed to add the word`;
  }
}

class ListCommand extends NgrokSubcommandController {
  constructor() {
    super(SubcommandNames.List, "Show the banned word list");
  }

  async execute() {
    if (this.wordList) {
      this.result = this.wordList.wordList();
      if (this.result.length > 0) {
        return "Tracking word list";
      }
    }
    return "Empty list";
  }
}

class RankingCommand extends NgrokSubcommandController {
  constructor() {
    super(
      SubcommandNames.Ranking,
      "Show the local ranking of saying banned words"
    );
  }

  async execute(options: OptionExtraction) {
    if (this.wordList) {
      this.result = this.wordList.ranking(
        options["word"]?.toString(),
        options["user"]?.toString()
      );
      if (this.result.length > 0) {
        return "Ranking";
      }
    }
    return "Empty list";
  }
}

class RemoveCommand extends NgrokSubcommandController {
  constructor() {
    super(SubcommandNames.Remove, "Remove word from banned list");
  }

  async execute(options: OptionExtraction) {
    if (this.wordList) {
      const word = this.wordList.remove(options["word"] as string);
      this.result = this.wordList.wordList();
      if (word) {
        return `Removed the word ${word} from the tracking list.`;
      }
    }
    return `Failed to remove the word`;
  }
}

const options: DiscordSubcommandOption = {
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

class WordRankingController extends SubcommandExecutor<NgrokSubcommandController> {
  constructor() {
    super("word-ranking", "Tracking and ranking words");
    this.add(AddCommand, ListCommand, RemoveCommand, RankingCommand);
  }
}

class DiscordWordRankingController extends DiscordSubcommandController<NgrokSubcommandController> {
  readonly updater: Updater = new Updater("Word ranking");

  async preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    NgrokSubcommandController.wordList = Database.get(
      interaction.guild?.id
    )?.bannedWord;
    NgrokSubcommandController.result = [];
    return undefined;
  }

  async createReply(options: OptionExtraction, description: string) {
    let field: APIEmbedField[] = [];
    if (
      options.subcommand == SubcommandNames.List ||
      options.subcommand == SubcommandNames.Ranking
    ) {
      field = NgrokSubcommandController.result?.map(
        ({ id, word, count }, index) => {
          return {
            name: `#${index + 1}. Typed count: ${count}`,
            value: id ? userMention(id) : word ? word : "",
          };
        }
      );
    }
    return this.updater.message({
      description,
      field,
    });
  }
}

const executor = new WordRankingController();
const discord = new DiscordWordRankingController(executor, options);

export { discord };
