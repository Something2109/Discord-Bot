import { WordRankingSubcommand } from "./template";

export class ListCommand extends WordRankingSubcommand {
  constructor() {
    super("list", "Show the banned word list");
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
