import { OptionExtraction } from "../../utils/controller/Executor";
import { WordRankingSubcommand } from "./template";

export class RemoveCommand extends WordRankingSubcommand {
  constructor() {
    super("remove", "Remove word from banned list");
  }

  async execute({ word }: OptionExtraction) {
    if (this.wordList && word) {
      if (this.wordList.remove(word.toString())) {
        this.result = this.wordList.wordList();

        return `Removed the word ${word} from the tracking list.`;
      }
    }
    return `Failed to remove the word`;
  }
}
