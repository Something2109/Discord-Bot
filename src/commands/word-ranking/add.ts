import { OptionExtraction } from "../../utils/controller/Executor";
import { WordRankingSubcommand } from "./template";

export class AddCommand extends WordRankingSubcommand {
  constructor() {
    super("add", "Add word to ban");
  }

  async execute({ word }: OptionExtraction) {
    if (this.wordList && word) {
      if (this.wordList.add(word.toString())) {
        this.result = this.wordList.wordList();

        return `Added the word ${word} to the tracking list.`;
      }
    }
    return `Failed to add the word`;
  }
}
