import { Updater } from "../../utils/Updater";
import { BannedWordList } from "../../utils/database/List/WordList";
import { Database } from "../../utils/database/Database";
import {
  BaseExecutor,
  OptionExtraction,
} from "../../utils/controller/Executor";
import {
  DiscordCommandController,
  InteractionType,
} from "../../utils/controller/Discord";
import { BaseMessageOptions } from "discord.js";

abstract class WordRankingSubcommand<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> extends BaseExecutor<Options, Result> {
  static wordList?: BannedWordList;

  get wordList() {
    return WordRankingSubcommand.wordList;
  }

  set wordList(list: BannedWordList | undefined) {
    WordRankingSubcommand.wordList = list;
  }
}

class DiscordWordRankingController<
  Options extends OptionExtraction | undefined = undefined,
  Result extends any = string
> extends DiscordCommandController<Options, Result> {
  readonly updater: Updater = new Updater("Word ranking");

  constructor(executor: WordRankingSubcommand<Options, Result>) {
    super(executor);
  }

  async preExecute(
    interaction: InteractionType
  ): Promise<BaseMessageOptions | undefined> {
    WordRankingSubcommand.wordList = Database.get(interaction.guild?.id)?.get(
      BannedWordList
    );

    return undefined;
  }
}

export { WordRankingSubcommand, DiscordWordRankingController };
