import { OptionExtraction } from "../../utils/controller/Executor";
import { WordRankingSubcommand } from "./template";

export class RankingCommand extends WordRankingSubcommand {
  constructor() {
    super("ranking", "Show the local ranking of saying banned words");
  }

  async execute({ word, user }: OptionExtraction) {
    if (this.wordList && (word || user)) {
      this.result = this.wordList.ranking(word as string, user as string);
      if (this.result.length > 0) {
        return "Ranking";
      }
    }
    return "Empty list";
  }
}
